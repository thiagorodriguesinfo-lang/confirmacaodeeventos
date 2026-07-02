import type { ImportRepository } from '@/core/repositories/import.repository';
import type { GuestRepository } from '@/core/repositories/guest.repository';
import type { ImportLogStatus, ImportSource } from '@prisma/client';

export interface ImportLogDecision {
  logId: string;
  decision: 'APPROVE' | 'REJECT';
  /** Permite corrigir nome/telefone antes de aprovar (fluxo "Editar" da fila de revisao). */
  correctedName?: string;
  correctedPhone?: string;
}

const SOURCE_TO_ORIGIN: Record<ImportSource, ImportSource> = {
  MANUAL: 'MANUAL',
  CSV: 'CSV',
  EXCEL: 'EXCEL',
  PASTE: 'PASTE',
  WHATSAPP_FORWARD: 'WHATSAPP_FORWARD',
  VCARD: 'VCARD',
};

/**
 * Aplica as decisoes do administrador na fila de revisao ("Contatos
 * Recebidos"): aprova (opcionalmente com correcoes), rejeita, ou mantem
 * como duplicado. Somente apos esta etapa os contatos viram Guests de
 * verdade — nunca ha disparo automatico direto de uma importacao.
 */
export class ApproveImportUseCase {
  constructor(
    private readonly importRepository: ImportRepository,
    private readonly guestRepository: GuestRepository,
  ) {}

  async execute(importId: string, decisions: ImportLogDecision[]) {
    const importBatch = await this.importRepository.findById(importId);
    if (!importBatch) throw new Error('Importacao nao encontrada');

    let approvedCount = 0;
    let rejectedCount = 0;

    for (const decision of decisions) {
      const log = importBatch.logs.find((l) => l.id === decision.logId);
      if (!log) continue;

      if (decision.decision === 'REJECT') {
        await this.importRepository.updateLog(log.id, { status: 'REJECTED' as ImportLogStatus });
        rejectedCount++;
        continue;
      }

      const name = decision.correctedName?.trim() || log.rawName?.trim();
      const phone = decision.correctedPhone?.trim() || log.normalizedPhone || log.rawPhone;

      if (!name || !phone) {
        await this.importRepository.updateLog(log.id, {
          status: 'REJECTED' as ImportLogStatus,
          errorReason: 'Nome ou telefone ausente apos revisao',
        });
        rejectedCount++;
        continue;
      }

      const existing = await this.guestRepository.findByEventAndPhone(importBatch.eventId, phone);
      if (existing) {
        await this.importRepository.updateLog(log.id, { status: 'DUPLICATE' as ImportLogStatus });
        continue;
      }

      const guest = await this.guestRepository.create({
        eventId: importBatch.eventId,
        name,
        phone,
        origin: SOURCE_TO_ORIGIN[importBatch.source],
        importId: importBatch.id,
        needsReview: false,
      });

      await this.guestRepository.addTimelineEvent(guest.id, 'IMPORTED', { importId: importBatch.id });
      await this.importRepository.updateLog(log.id, {
        status: 'APPROVED' as ImportLogStatus,
        resultingGuestId: guest.id,
      });
      approvedCount++;
    }

    const finalStatus = rejectedCount > 0 && approvedCount > 0 ? 'PARTIALLY_APPROVED' : approvedCount > 0 ? 'APPROVED' : 'REJECTED';

    return this.importRepository.updateStatus(importId, finalStatus, {
      approvedCount: importBatch.approvedCount + approvedCount,
      rejectedCount: importBatch.rejectedCount + rejectedCount,
    });
  }
}
