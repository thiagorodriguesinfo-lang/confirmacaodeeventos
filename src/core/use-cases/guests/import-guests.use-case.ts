import Papa from 'papaparse';
import type { ImportRepository } from '@/core/repositories/import.repository';
import type { GuestRepository } from '@/core/repositories/guest.repository';
import { normalizePhone } from '@/core/services/phone-normalizer.service';
import { parseContactsFromText } from '@/core/services/contact-text-parser.service';
import type { ImportSource } from '@prisma/client';

export interface ImportGuestsInput {
  eventId: string;
  source: Extract<ImportSource, 'CSV' | 'EXCEL' | 'PASTE' | 'MANUAL'>;
  fileName?: string;
  importedById?: string;
  /** Para CSV/Excel: conteudo ja convertido para texto CSV. Para PASTE: texto colado. Para MANUAL: ignorado (usar rawContacts). */
  rawText?: string;
  /** Usado quando o front ja envia pares nome/telefone estruturados (formulario manual ou upload de Excel pre-parseado). */
  rawContacts?: { name?: string | null; phone?: string | null }[];
}

/**
 * Importacao "clássica" de convidados: cadastro manual, CSV, Excel ou lista
 * colada. Assim como a importacao via WhatsApp, tudo entra como ImportLog
 * PENDING para revisao — mantendo um unico fluxo de aprovacao para
 * qualquer origem (Modulo 2).
 */
export class ImportGuestsUseCase {
  constructor(
    private readonly importRepository: ImportRepository,
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(input: ImportGuestsInput) {
    const candidates = this.extractCandidates(input);
    if (candidates.length === 0) throw new Error('Nenhum contato valido encontrado na importacao');

    const importBatch = await this.importRepository.create({
      eventId: input.eventId,
      source: input.source,
      fileName: input.fileName,
      rawPayload: input.rawText,
      importedById: input.importedById,
    });

    const logs = [];
    for (const candidate of candidates) {
      const normalizedPhone = candidate.phone ? normalizePhone(candidate.phone) : null;
      const duplicate = normalizedPhone
        ? await this.guestRepository.findByEventAndPhone(input.eventId, normalizedPhone)
        : null;

      logs.push({
        importId: importBatch.id,
        rawName: candidate.name ?? null,
        rawPhone: candidate.phone ?? null,
        normalizedPhone,
        contentType: 'structured',
        status: (duplicate ? 'DUPLICATE' : 'PENDING') as 'DUPLICATE' | 'PENDING',
        errorReason: normalizedPhone ? undefined : 'Telefone invalido ou ausente',
      });
    }

    await this.importRepository.addLogs(logs);
    const duplicateCount = logs.filter((l) => l.status === 'DUPLICATE').length;
    await this.importRepository.updateStatus(importBatch.id, 'PENDING_REVIEW', { duplicateCount, totalContacts: logs.length });

    return importBatch;
  }

  private extractCandidates(input: ImportGuestsInput): { name: string | null; phone: string | null }[] {
    if (input.rawContacts) {
      return input.rawContacts.map((c) => ({ name: c.name ?? null, phone: c.phone ?? null }));
    }

    if (!input.rawText) return [];

    if (input.source === 'CSV' || input.source === 'EXCEL') {
      const parsed = Papa.parse<Record<string, string>>(input.rawText, { header: true, skipEmptyLines: true });
      return parsed.data.map((row) => {
        const keys = Object.keys(row).reduce<Record<string, string>>((acc, k) => {
          acc[k.trim().toLowerCase()] = row[k] ?? '';
          return acc;
        }, {});
        const name = keys.nome ?? keys.name ?? Object.values(row)[0] ?? null;
        const phone = keys.telefone ?? keys.phone ?? keys.celular ?? keys.whatsapp ?? Object.values(row)[1] ?? null;
        return { name: name?.trim() || null, phone: phone?.trim() || null };
      });
    }

    // PASTE: reaproveita o parser inteligente de texto livre
    return parseContactsFromText(input.rawText).map((c) => ({ name: c.name, phone: c.phone }));
  }
}
