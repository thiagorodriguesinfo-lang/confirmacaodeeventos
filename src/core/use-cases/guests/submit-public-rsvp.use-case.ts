import type { Prisma } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';
import { renderTemplate } from '@/core/services/message-template.service';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';

export interface SubmitPublicRsvpInput {
  eventPublicToken: string;
  guestId: string;
  confirmed: boolean;
  companions: { name: string; age?: number }[];
}

/**
 * Modulo "Diferencial" — pagina publica do convite. Permite ao convidado
 * confirmar presenca e adicionar acompanhantes diretamente pelo navegador
 * (sem depender de responder no WhatsApp), mantendo tudo sincronizado com
 * o mesmo modelo de dados usado pelo chatbot (Guest/Companion/TimelineEvent).
 * Tambem envia a mensagem de agradecimento/recusa pelo WhatsApp, para que a
 * experiencia seja consistente independente do canal escolhido.
 */
export class SubmitPublicRsvpUseCase {
  async execute(input: SubmitPublicRsvpInput) {
    const event = await prisma.event.findUniqueOrThrow({ where: { publicToken: input.eventPublicToken } });
    const guest = await prisma.guest.findFirstOrThrow({ where: { id: input.guestId, eventId: event.id } });

    const vars = {
      nome: guest.name,
      evento: event.name,
      data: event.date.toLocaleDateString('pt-BR'),
      hora: event.time,
      local: event.location,
      maps: event.googleMapsUrl ?? '',
    };

    if (!input.confirmed) {
      await prisma.guest.update({
        where: { id: guest.id },
        data: { status: 'DECLINED', chatbotStep: 'DECLINED', respondedAt: new Date() },
      });
      await this.log(guest.id, 'DECLINED', { source: 'public_page' });
      await this.notify(event.ownerId, event.id, guest.id, 'NEW_DECLINE', `${guest.name} recusou o convite de ${event.name}`);
      await this.trySendWhatsapp(guest.phone, renderTemplate(event.declinedMessage, vars));
      return { status: 'DECLINED' as const };
    }

    const confirmedCount = 1 + input.companions.length;

    await prisma.$transaction([
      prisma.guest.update({
        where: { id: guest.id },
        data: { status: 'CONFIRMED', chatbotStep: 'COMPLETED', confirmedCount, respondedAt: new Date() },
      }),
      prisma.companion.deleteMany({ where: { guestId: guest.id } }),
      ...(input.companions.length > 0
        ? [
            prisma.companion.createMany({
              data: input.companions.map((c) => ({ guestId: guest.id, name: c.name, age: c.age ?? null })),
            }),
          ]
        : []),
    ]);

    await this.log(guest.id, 'CONFIRMED', { source: 'public_page', confirmedCount });
    await this.notify(event.ownerId, event.id, guest.id, 'NEW_CONFIRMATION', `${guest.name} confirmou presença em ${event.name}`);
    await this.trySendWhatsapp(guest.phone, renderTemplate(event.thankYouMessage, vars));

    return { status: 'CONFIRMED' as const, confirmedCount };
  }

  private async log(guestId: string, type: string, payload: Record<string, unknown>) {
    await prisma.timelineEvent.create({ data: { guestId, type, payload: payload as Prisma.InputJsonValue } });
  }

  private async notify(userId: string, eventId: string, guestId: string, type: 'NEW_CONFIRMATION' | 'NEW_DECLINE', message: string) {
    await prisma.notification.create({
      data: {
        userId,
        eventId,
        type,
        title: type === 'NEW_CONFIRMATION' ? 'Nova confirmação' : 'Nova recusa',
        message,
        payload: { guestId },
      },
    });
  }

  private async trySendWhatsapp(to: string, message: string) {
    try {
      const provider = await getWhatsappProvider();
      await provider.sendText({ to, message });
    } catch (error) {
      // Falha ao notificar via WhatsApp nao deve impedir a confirmacao feita pela pagina publica.
      console.error('[public-rsvp] falha ao enviar mensagem de confirmação via WhatsApp:', error);
    }
  }
}
