'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { CreateDispatchJobUseCase } from '@/core/use-cases/dispatch/create-dispatch-job.use-case';
import { ControlDispatchJobUseCase, type DispatchControlAction } from '@/core/use-cases/dispatch/control-dispatch-job.use-case';
import { dispatchGuestsSchema } from '@/lib/validations/guest.schema';
import { prisma } from '@/infrastructure/database/prisma';

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Não autenticado');
  return session;
}

export async function createDispatchJobAction(formData: FormData) {
  const session = await requireSession();

  const statusFilterRaw = formData.getAll('guestStatusFilter');
  const parsed = dispatchGuestsSchema.safeParse({
    eventId: formData.get('eventId'),
    ratePerMinute: formData.get('ratePerMinute'),
    guestStatusFilter: statusFilterRaw.length > 0 ? statusFilterRaw : undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const useCase = new CreateDispatchJobUseCase();
  try {
    const job = await useCase.execute({ ...parsed.data, createdById: session.user.id });
    revalidatePath(`/dashboard/events/${parsed.data.eventId}/dispatch`);
    return { success: true, message: `Disparo criado para ${job.totalTargets} convidados`, jobId: job.id };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao criar disparo' };
  }
}

export async function controlDispatchJobAction(jobId: string, eventId: string, action: DispatchControlAction) {
  await requireSession();
  const useCase = new ControlDispatchJobUseCase();
  await useCase.execute(jobId, action);
  revalidatePath(`/dashboard/events/${eventId}/dispatch`);
}

export async function listDispatchJobsAction(eventId: string) {
  await requireSession();
  return prisma.dispatchJob.findMany({ where: { eventId }, orderBy: { createdAt: 'desc' } });
}
