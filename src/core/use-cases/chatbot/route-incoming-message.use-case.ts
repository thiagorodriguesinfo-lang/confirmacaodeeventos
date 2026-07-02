import type { InboundMessage, WhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.interface';
import type { GuestRepository } from '@/core/repositories/guest.repository';
import type { ConversationRepository } from '@/core/repositories/conversation.repository';
import type { MessageRepository } from '@/core/repositories/message.repository';
import type { ImportRepository } from '@/core/repositories/import.repository';
import { ProcessGuestReplyUseCase } from './process-guest-reply.use-case';
import { ImportFromWhatsappContactsUseCase } from '@/core/use-cases/guests/import-from-whatsapp-contacts.use-case';
import { prisma } from '@/infrastructure/database/prisma';

const TERMINAL_STEPS = new Set(['COMPLETED', 'DECLINED']);

/**
 * Ponto unico de entrada para toda mensagem recebida no numero do sistema.
 *
 * Regra de roteamento:
 *  1. Se o telefone remetente ja e um Guest com conversa em andamento
 *     (chatbot_step != COMPLETED/DECLINED e existe convite enviado),
 *     a mensagem alimenta a maquina de estados do RSVP.
 *  2. Caso contrario — numero desconhecido enviando contato(s)/VCard/lista de
 *     texto — trata-se de uma importacao de convidados (Modulo 2) e cai na
 *     fila "Contatos Recebidos" do evento ativo mais recente do
 *     administrador que possui esse numero configurado.
 *  3. Qualquer outro caso e apenas registrado em WhatsappLog para auditoria.
 */
export class RouteIncomingMessageUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly conversationRepository: ConversationRepository,
    private readonly messageRepository: MessageRepository,
    private readonly importRepository: ImportRepository,
    private readonly whatsappProvider: WhatsappProvider,
  ) {}

  async execute(message: InboundMessage) {
    await prisma.whatsappLog.create({
      data: {
        direction: 'INBOUND',
        provider: message.provider,
        eventType: message.contentType,
        waId: message.waId,
        payload: message.raw as object,
      },
    });

    const activeGuest = await this.findActiveGuestConversation(message.waId);

    if (activeGuest) {
      const useCase = new ProcessGuestReplyUseCase(
        this.guestRepository,
        this.conversationRepository,
        this.messageRepository,
        this.whatsappProvider,
      );
      return { type: 'chatbot_reply' as const, result: await useCase.execute({ guest: activeGuest, incomingText: message.text ?? '' }) };
    }

    if (message.contentType === 'contacts' || message.contentType === 'text') {
      const targetEvent = await this.resolveTargetEventForImport();
      if (!targetEvent) return { type: 'ignored' as const, reason: 'Nenhum evento ativo configurado para importacao' };

      const useCase = new ImportFromWhatsappContactsUseCase(this.importRepository, this.guestRepository);
      const importBatch = await useCase.execute({ eventId: targetEvent.id, message });
      return { type: 'import_queued' as const, importBatch };
    }

    return { type: 'ignored' as const, reason: `Tipo de conteudo nao tratado: ${message.contentType}` };
  }

  private async findActiveGuestConversation(waId: string) {
    const guests = await this.guestRepository.findByPhoneAcrossEvents(waId);
    const withEvent = await Promise.all(
      guests
        .filter((g) => g.sentAt !== null && !TERMINAL_STEPS.has(g.chatbotStep))
        .map((g) => prisma.guest.findUnique({ where: { id: g.id }, include: { event: true } })),
    );

    const candidates = withEvent.filter(Boolean) as NonNullable<(typeof withEvent)[number]>[];
    candidates.sort((a, b) => (b.sentAt?.getTime() ?? 0) - (a.sentAt?.getTime() ?? 0));
    return candidates[0] ?? null;
  }

  private resolveTargetEventForImport() {
    // MVP: contatos encaminhados para o numero do sistema entram na fila do
    // evento ACTIVE mais recente. Em uma evolucao multi-numero/multi-evento,
    // o numero de origem do webhook (phone_number_id / instancia) deveria
    // ser mapeado 1:1 para um evento especifico.
    return prisma.event.findFirst({ where: { status: 'ACTIVE' }, orderBy: { createdAt: 'desc' } });
  }
}
