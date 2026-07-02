import type { Import, ImportLog, ImportStatus, Prisma } from '@prisma/client';
import type { CreateImportInput, CreateImportLogInput, ImportRepository } from '@/core/repositories/import.repository';
import { prisma } from './prisma';

export class PrismaImportRepository implements ImportRepository {
  create(input: CreateImportInput) {
    return prisma.import.create({ data: input });
  }

  addLogs(inputs: CreateImportLogInput[]) {
    return prisma.importLog.createMany({ data: inputs as Prisma.ImportLogCreateManyInput[] });
  }

  findById(id: string) {
    return prisma.import.findUnique({ where: { id }, include: { logs: true } });
  }

  listByEvent(eventId: string) {
    return prisma.import.findMany({ where: { eventId }, orderBy: { createdAt: 'desc' } });
  }

  listPendingLogs(importId: string) {
    return prisma.importLog.findMany({ where: { importId, status: 'PENDING' }, orderBy: { createdAt: 'asc' } });
  }

  updateLog(id: string, data: Partial<ImportLog>) {
    return prisma.importLog.update({ where: { id }, data: data as Prisma.ImportLogUpdateInput });
  }

  updateStatus(
    id: string,
    status: ImportStatus,
    counts?: Partial<Pick<Import, 'approvedCount' | 'rejectedCount' | 'duplicateCount' | 'totalContacts'>>,
  ) {
    return prisma.import.update({ where: { id }, data: { status, ...counts } });
  }
}
