import type { Guest } from '@prisma/client';
import type { GuestRepository } from '@/core/repositories/guest.repository';
import type { ConversationRepository } from '@/core/repositories/conversation.repository';
import type { MessageRepository } from '@/core/repositories/message.repository';
import { processRsvpStep, type ChatbotStep, type RsvpContext } from '@/core/services/rsvp-state-machine';
import { renderTemplate } from '@/core/services/message-template.service';
import type { WhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.interface';
import { prisma } from '@/infrastructure/database/prisma';

export interface ProcessGuestReplyInput {
  guest: Guest & { event: { name: string; date: Date; time: string; location: string; googleMapsUrl: string | null; thankYouMessage: string; declinedMessage: string } };
  incomingText: string;
  providerMessageId?: string;
}

/**
 * Conduz um passo da conversa de RSVP para um convidado que ja recebeu o
 * convite (Modulo Chatbot). Orquestra: maquina de estados (pura) ->
 * persistencia (Guest, ConversationState, Companion, TimelineEvent) ->
 * envio da resposta via WhatsappProvider.
 */
export class ProcessGuestReplyUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly whatsappProvider: WhatsappProvider,
  ) {}

  async execute(input: ProcessGuestReplyInput) {
    const { guest, incomingText } = input;

    await this.messageRepository.log({
      guestId: guest.id,
      direction: 'INBOUND',
      type: 'TEXT',
      status: 'RECEIVED',
      content: incomingText,
      providerMessageId: input.providerMessageId,
      providerName: this.whatsappProvider.name,
    });

    const conversation = await this.conversationRepository.getOrCreate(guest.id);
    const currentStep = (conversation.currentStep as ChatbotStep) ?? 'NOT_STARTED';
    const context = (conversation.context as RsvpContext) ?? {};

    const vars = {
      nome: guest.name,
      evento: guest.event.name,
      data: guest.event.date.toLocaleDateString('pt-BR'),
      hora: guest.event.time,
      local: guest.event.location,
      maps: guest.event.googleMapsUrl ?? '',
    };

    const result = processRsvpStep(currentStep, context, incomingText, {
      thankYou: renderTemplate(guest.event.thankYouMessage, vars),
      declined: renderTemplate(guest.event.declinedMessage, vars),
    });

    await this.conversationRepository.update(guest.id, {
      currentStep: result.nextStep,
      context: result.context,
      lastMessageAt: new Date(),
    });

    await this.guestRepository.updateChatbotStep(guest.id, result.nextStep);

    if (result.finalStatus === 'CONFIRMED') {
      await this.finalizeConfirmation(guest.id, result.confirmedCount ?? 1, result.companions ?? []);
    } else if (result.finalStatus === 'DECLINED') {
      await this.finalizeDecline(guest.id);
    }

    const sendResult = await this.whatsappProvider.sendText({ to: guest.phone, message: result.outboundMessage });

    await this.messageRepository.log({
      guestId: guest.id,
      direction: 'OUTBOUND',
      type: 'TEXT',
      status: 'SENT',
      content: result.outboundMessage,
      providerMessageId: sendResult.providerMessageId,
      providerName: this.whatsappProvider.name,
    });

    return result;
  }

  private async finalizeConfirmation(guestId: string, confirmedCount: number, companions: { name: string; age: number | null }[]) {
    await prisma.$transaction([
      prisma.guest.update({
        where: { id: guestId },
        data: { status: 'CONFIRMED', confirmedCount, respondedAt: new Date() },
      }),
      ...(companions.length > 0
        ? [
            prisma.companion.createMany({
              data: companions.map((c) => ({ guestId, name: c.name, age: c.age })),
            }),
          ]
        : []),
    ]);

    await this.guestRepository.addTimelineEvent(guestId, 'CONFIRMED', { confirmedCount, companions });
    await this.notifyAdmins(guestId, 'NEW_CONFIRMATION');
  }

  private async finalizeDecline(guestId: string) {
    await prisma.guest.update({ where: { id: guestId }, data: { status: 'DECLINED', respondedAt: new Date() } });
    await this.guestRepository.addTimelineEvent(guestId, 'DECLINED');
    await this.notifyAdmins(guestId, 'NEW_DECLINE');
  }

  private async notifyAdmins(guestId: string, type: 'NEW_CONFIRMATION' | 'NEW_DECLINE') {
    const guest = await prisma.guest.findUnique({ where: { id: guestId }, include: { event: { include: { owner: true } } } });
    if (!guest) return;

    const title = type === 'NEW_CONFIRMATION' ? 'Nova confirmação' : 'Nova recusa';
    const message =
      type === 'NEW_CONFIRMATION'
        ? `${guest.name} confirmou presença em ${guest.event.name}`
        : `${guest.name} recusou o convite de ${guest.event.name}`;

    await prisma.notification.create({
      data: {
        userId: guest.event.ownerId,
        eventId: guest.eventId,
        type,
        title,
        message,
        payload: { guestId: guest.id },
      },
    });
  }
}
