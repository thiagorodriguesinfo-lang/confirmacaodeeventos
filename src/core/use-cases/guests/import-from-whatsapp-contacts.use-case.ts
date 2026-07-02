import type { ImportRepository } from '@/core/repositories/import.repository';
import type { GuestRepository } from '@/core/repositories/guest.repository';
import { parseVCards } from '@/core/services/vcard-parser.service';
import { parseContactsFromText } from '@/core/services/contact-text-parser.service';
import { normalizePhone } from '@/core/services/phone-normalizer.service';
import type { InboundMessage } from '@/infrastructure/whatsapp/whatsapp-provider.interface';

export interface ImportFromWhatsappContactsInput {
  eventId: string;
  message: InboundMessage;
}

/**
 * Recurso central do Modulo 2: sempre que alguem encaminha contatos (VCard)
 * ou digita uma lista de nomes/telefones para o numero do sistema, este
 * use-case interpreta o conteudo e cria um lote de Import + ImportLogs em
 * estado PENDING. NUNCA cria Guests diretamente nem dispara mensagens —
 * tudo fica na fila "Contatos Recebidos" ate revisao do administrador
 * (approve-import.use-case.ts).
 */
export class ImportFromWhatsappContactsUseCase {
  constructor(
    private readonly importRepository: ImportRepository,
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(input: ImportFromWhatsappContactsInput) {
    const { eventId, message } = input;

    const candidates = this.extractCandidates(message);

    if (candidates.length === 0) {
      return null;
    }

    const importBatch = await this.importRepository.create({
      eventId,
      source: 'WHATSAPP_FORWARD',
      rawPayload: message.text ?? JSON.stringify(message.contacts ?? message.raw),
      senderWaId: message.waId,
      senderName: message.senderName,
    });

    const logs = [];
    for (const candidate of candidates) {
      const normalizedPhone = candidate.phone ? normalizePhone(candidate.phone) : null;
      const duplicate = normalizedPhone ? await this.guestRepository.findByEventAndPhone(eventId, normalizedPhone) : null;

      logs.push({
        importId: importBatch.id,
        rawName: candidate.name,
        rawPhone: candidate.phone,
        normalizedPhone,
        contentType: candidate.contentType,
        status: (duplicate ? 'DUPLICATE' : normalizedPhone ? 'PENDING' : 'PENDING') as
          | 'DUPLICATE'
          | 'PENDING',
        errorReason: normalizedPhone ? undefined : 'Telefone nao identificado — requer correcao manual',
      });
    }

    await this.importRepository.addLogs(logs);

    const duplicateCount = logs.filter((l) => l.status === 'DUPLICATE').length;
    await this.importRepository.updateStatus(importBatch.id, 'PENDING_REVIEW', { duplicateCount, totalContacts: logs.length });

    return importBatch;
  }

  private extractCandidates(
    message: InboundMessage,
  ): { name: string | null; phone: string | null; contentType: string }[] {
    // Caso 1: contato(s) do WhatsApp encaminhado(s) como VCard
    if (message.contentType === 'contacts') {
      const vcardText = message.text ?? '';
      const vcardContacts = parseVCards(vcardText);

      if (vcardContacts.length > 0) {
        return vcardContacts.flatMap((c): { name: string | null; phone: string | null; contentType: string }[] =>
          c.phones.length > 0
            ? c.phones.map((phone) => ({ name: c.name, phone, contentType: 'vcard' }))
            : [{ name: c.name, phone: null, contentType: 'vcard' }],
        );
      }

      // Fallback: contatos sem vcard bruto (ex: Meta Cloud API ja entrega estruturado)
      return (message.contacts ?? []).flatMap(
        (c): { name: string | null; phone: string | null; contentType: string }[] =>
          c.phones.length > 0
            ? c.phones.map((phone) => ({ name: c.name ?? null, phone, contentType: 'contact_card' }))
            : [{ name: c.name ?? null, phone: null, contentType: 'contact_card' }],
      );
    }

    // Caso 2: texto livre digitado/colado, ex: "João - 21999999999" (um ou varios por linha)
    if (message.contentType === 'text' && message.text) {
      return parseContactsFromText(message.text).map((c) => ({
        name: c.name,
        phone: c.phone,
        contentType: 'text',
      }));
    }

    return [];
  }
}
