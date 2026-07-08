import { prisma } from '@/infrastructure/database/prisma';
import { renderTemplate } from '@/core/services/message-template.service';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';

/**
 * Envia o convite (imagem + texto + link) para um unico convidado, sob
 * demanda a partir do painel — usado para testar a mensagem/imagem antes
 * do disparo em massa. Segue exatamente o mesmo formato do dispatch-worker
 * (mesmo template, mesma imagem, mesmo link), so que fora da fila/rate limit.
 */
export class SendInvitationToGuestUseCase {
  async execute(guestId: string) {
    const guest = await prisma.guest.findUniqueOrThrow({ where: { id: guestId }, include: { event: true } });
    const whatsapp = await getWhatsappProvider();

    const vars = {
      nome: guest.name,
      evento: guest.event.name,
      data: guest.event.date.toLocaleDateString('pt-BR'),
      hora: guest.event.time,
      local: guest.event.location,
      maps: guest.event.googleMapsUrl ?? '',
      link: `${process.env.NEXT_PUBLIC_APP_URL}/convite/${guest.event.publicToken}/${guest.id}`,
    };
    const text = renderTemplate(guest.event.defaultMessage, vars);

    const result = guest.event.invitationImage
      ? await whatsapp.sendImage({ to: guest.phone, imageUrl: guest.event.invitationImage, caption: text })
      : await whatsapp.sendText({ to: guest.phone, message: text });

    await prisma.$transaction([
      prisma.message.create({
        data: {
          guestId: guest.id,
          direction: 'OUTBOUND',
          type: guest.event.invitationImage ? 'IMAGE' : 'TEXT',
          status: 'SENT',
          content: text,
          mediaUrl: guest.event.invitationImage,
          providerMessageId: result.providerMessageId,
          providerName: whatsapp.name,
          sentAt: new Date(),
        },
      }),
      prisma.guest.update({
        where: { id: guest.id },
        data: { status: 'SENT', sentAt: new Date(), chatbotStep: 'AWAITING_CONFIRMATION' },
      }),
      prisma.timelineEvent.create({ data: { guestId: guest.id, type: 'INVITE_SENT', payload: { source: 'manual_single' } } }),
      prisma.conversationState.upsert({
        where: { guestId: guest.id },
        update: { currentStep: 'AWAITING_CONFIRMATION', lastMessageAt: new Date() },
        create: { guestId: guest.id, currentStep: 'AWAITING_CONFIRMATION', context: {}, lastMessageAt: new Date() },
      }),
    ]);
  }
}
