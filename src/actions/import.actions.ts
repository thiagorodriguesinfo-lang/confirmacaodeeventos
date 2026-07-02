'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/container';
import { ImportGuestsUseCase } from '@/core/use-cases/guests/import-guests.use-case';
import { ApproveImportUseCase, type ImportLogDecision } from '@/core/use-cases/guests/approve-import.use-case';
import { prisma } from '@/infrastructure/database/prisma';

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Não autenticado');
  return session;
}

export async function importCsvAction(eventId: string, formData: FormData) {
  const session = await requireSession();
  const file = formData.get('file') as File | null;
  const pasteText = formData.get('pasteText') as string | null;

  const useCase = new ImportGuestsUseCase(container.importRepository, container.guestRepository);

  try {
    if (file && file.size > 0) {
      const text = await file.text();
      const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');
      await useCase.execute({
        eventId,
        source: isExcel ? 'EXCEL' : 'CSV',
        fileName: file.name,
        rawText: text,
        importedById: session.user.id,
      });
    } else if (pasteText?.trim()) {
      await useCase.execute({ eventId, source: 'PASTE', rawText: pasteText, importedById: session.user.id });
    } else {
      return { success: false, message: 'Nenhum arquivo ou texto informado' };
    }
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao importar' };
  }

  revalidatePath(`/dashboard/events/${eventId}/imports`);
  return { success: true, message: 'Importação recebida — revise os contatos antes de aprovar' };
}

export async function listImportsAction(eventId: string) {
  await requireSession();
  return container.importRepository.listByEvent(eventId);
}

export async function getImportWithLogsAction(importId: string) {
  await requireSession();
  return container.importRepository.findById(importId);
}

export async function approveImportAction(importId: string, eventId: string, decisions: ImportLogDecision[]) {
  await requireSession();
  const useCase = new ApproveImportUseCase(container.importRepository, container.guestRepository);
  await useCase.execute(importId, decisions);
  revalidatePath(`/dashboard/events/${eventId}/imports`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}

export async function approveAllPendingAction(importId: string, eventId: string) {
  await requireSession();
  const pending = await prisma.importLog.findMany({ where: { importId, status: 'PENDING' } });
  const useCase = new ApproveImportUseCase(container.importRepository, container.guestRepository);
  await useCase.execute(
    importId,
    pending.map((log) => ({ logId: log.id, decision: 'APPROVE' as const })),
  );
  revalidatePath(`/dashboard/events/${eventId}/imports`);
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}
