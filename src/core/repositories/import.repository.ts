import type { Import, ImportLog, ImportLogStatus, ImportSource, ImportStatus } from '@prisma/client';

export interface CreateImportInput {
  eventId: string;
  source: ImportSource;
  fileName?: string;
  rawPayload?: string;
  senderWaId?: string;
  senderName?: string;
  importedById?: string;
}

export interface CreateImportLogInput {
  importId: string;
  rawName?: string | null;
  rawPhone?: string | null;
  normalizedPhone?: string | null;
  contentType?: string;
  status?: ImportLogStatus;
  errorReason?: string;
}

export interface ImportRepository {
  create(input: CreateImportInput): Promise<Import>;
  addLogs(inputs: CreateImportLogInput[]): Promise<{ count: number }>;
  findById(id: string): Promise<(Import & { logs: ImportLog[] }) | null>;
  listByEvent(eventId: string): Promise<Import[]>;
  listPendingLogs(importId: string): Promise<ImportLog[]>;
  updateLog(id: string, data: Partial<ImportLog>): Promise<ImportLog>;
  updateStatus(
    id: string,
    status: ImportStatus,
    counts?: Partial<Pick<Import, 'approvedCount' | 'rejectedCount' | 'duplicateCount' | 'totalContacts'>>,
  ): Promise<Import>;
}
