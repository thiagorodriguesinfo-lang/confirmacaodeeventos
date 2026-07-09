import { prisma } from '@/infrastructure/database/prisma';
import { renderTemplate } from '@/core/services/message-template.service';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';

export interface ManuallyConfirmGuestInput {
  guestId: string;
  confirmed: boolean;
  /** Ausente = nao mexe nos acompanhantes ja cadastrados (ex: pagina da equipe, que so confirma/recusa). */
  companions?: { name: string; age?: number }[];
  notifyWhatsapp: boolean;
}

/**
 * Permite que o administrador registre a resposta de um convidado
 * diretamente pelo painel (ex: confirmou por telefone/presencialmente),
 * sem depender do chatbot ou da página pública. Usa o mesmo modelo de
 * dados (Guest/Companion/TimelineEvent) para manter tudo consistente
 * com os outros dois canais de confirmação.
 */
export class ManuallyConfirmGuestUseCase {
  async execute(input: ManuallyConfirmGuestInput) {
    const guest = await prisma.guest.findUniqueOrThrow({ where: { id: input.guestId }, include: { event: true } });

    const vars = {
      nome: guest.name,
      evento: guest.event.name,
      data: guest.event.date.toLocaleDateString('pt-BR'),
      hora: guest.event.time,
      local: guest.event.location,
      maps: guest.event.googleMapsUrl ?? '',
    };

    const companionOps =
      input.companions !== undefined
        ? [
            prisma.companion.deleteMany({ where: { guestId: guest.id } }),
            ...(input.companions.length > 0
              ? [
                  prisma.companion.createMany({
                    data: input.companions.map((c) => ({ guestId: guest.id, name: c.name, age: c.age ?? null })),
                  }),
                ]
              : []),
          ]
        : [];

    if (!input.confirmed) {
      await prisma.$transaction([
        prisma.guest.update({
          where: { id: guest.id },
          data: { status: 'DECLINED', chatbotStep: 'DECLINED', respondedAt: new Date() },
        }),
        ...companionOps,
        prisma.timelineEvent.create({ data: { guestId: guest.id, type: 'DECLINED', payload: { source: 'manual_admin' } } }),
      ]);

      if (input.notifyWhatsapp) await this.trySendWhatsapp(guest.phone, renderTemplate(guest.event.declinedMessage, vars));
      return { status: 'DECLINED' as const };
    }

    const confirmedCount = input.companions !== undefined ? 1 + input.companions.length : guest.confirmedCount;

    await prisma.$transaction([
      prisma.guest.update({
        where: { id: guest.id },
        data: { status: 'CONFIRMED', chatbotStep: 'COMPLETED', confirmedCount, respondedAt: new Date() },
      }),
      ...companionOps,
      prisma.timelineEvent.create({
        data: { guestId: guest.id, type: 'CONFIRMED', payload: { source: 'manual_admin', confirmedCount } },
      }),
    ]);

    if (input.notifyWhatsapp) await this.trySendWhatsapp(guest.phone, renderTemplate(guest.event.thankYouMessage, vars));
    return { status: 'CONFIRMED' as const, confirmedCount };
  }

  private async trySendWhatsapp(to: string, message: string) {
    try {
      const provider = await getWhatsappProvider();
      await provider.sendText({ to, message });
    } catch (error) {
      // Falha ao notificar via WhatsApp nao deve impedir o registro manual da confirmacao.
      console.error('[manually-confirm-guest] falha ao enviar mensagem via WhatsApp:', error);
    }
  }
}
