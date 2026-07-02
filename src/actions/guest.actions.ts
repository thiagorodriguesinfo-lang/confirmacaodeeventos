'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import type { GuestOrigin, GuestStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/container';
import { ListGuestsUseCase } from '@/core/use-cases/guests/list-guests.use-case';
import { manualGuestSchema } from '@/lib/validations/guest.schema';
import { normalizePhone } from '@/core/services/phone-normalizer.service';

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Não autenticado');
  return session;
}

export async function listGuestsAction(params: {
  eventId: string;
  status?: GuestStatus;
  origin?: GuestOrigin;
  needsReview?: boolean;
  search?: string;
  page?: number;
}) {
  await requireSession();
  const useCase = new ListGuestsUseCase(container.guestRepository);
  return useCase.execute(params);
}

export async function createManualGuestAction(eventId: string, formData: FormData) {
  await requireSession();

  const parsed = manualGuestSchema.safeParse({
    name: formData.get('name'),
    phone: formData.get('phone'),
    notes: formData.get('notes') || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) {
    return { success: false, message: 'Telefone inválido' };
  }

  const existing = await container.guestRepository.findByEventAndPhone(eventId, normalizedPhone);
  if (existing) {
    return { success: false, message: 'Já existe um convidado com esse telefone neste evento' };
  }

  await container.guestRepository.create({
    eventId,
    name: parsed.data.name,
    phone: normalizedPhone,
    notes: parsed.data.notes,
    origin: 'MANUAL',
  });

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { success: true, message: 'Convidado adicionado com sucesso' };
}

export async function updateGuestStatusAction(guestId: string, eventId: string, status: GuestStatus) {
  await requireSession();
  await container.guestRepository.update(guestId, { status });
  await container.guestRepository.addTimelineEvent(guestId, 'STATUS_MANUALLY_UPDATED', { status });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}

export async function deleteGuestAction(guestId: string, eventId: string) {
  await requireSession();
  const { prisma } = await import('@/infrastructure/database/prisma');
  await prisma.guest.delete({ where: { id: guestId } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}
