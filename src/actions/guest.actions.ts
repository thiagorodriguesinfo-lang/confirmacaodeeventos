'use server';

import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import type { GuestOrigin, GuestStatus } from '@prisma/client';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/container';
import { ListGuestsUseCase } from '@/core/use-cases/guests/list-guests.use-case';
import { manualGuestSchema, manualConfirmationSchema, editGuestSchema } from '@/lib/validations/guest.schema';
import { normalizePhone } from '@/core/services/phone-normalizer.service';
import { ManuallyConfirmGuestUseCase } from '@/core/use-cases/guests/manually-confirm-guest.use-case';
import { SendInvitationToGuestUseCase } from '@/core/use-cases/guests/send-invitation-to-guest.use-case';

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

export async function manuallyConfirmGuestAction(
  guestId: string,
  eventId: string,
  input: { confirmed: boolean; notifyWhatsapp: boolean; companions: { name: string; age?: number }[] },
) {
  await requireSession();

  const parsed = manualConfirmationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const useCase = new ManuallyConfirmGuestUseCase();
  const result = await useCase.execute({ guestId, ...parsed.data });

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return {
    success: true,
    message: result.status === 'CONFIRMED' ? 'Presença confirmada manualmente' : 'Convidado marcado como recusado',
  };
}

export async function updateGuestAction(guestId: string, eventId: string, input: { name: string; phone: string }) {
  await requireSession();

  const parsed = editGuestSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const normalizedPhone = normalizePhone(parsed.data.phone);
  if (!normalizedPhone) {
    return { success: false, message: 'Telefone inválido' };
  }

  const existing = await container.guestRepository.findByEventAndPhone(eventId, normalizedPhone);
  if (existing && existing.id !== guestId) {
    return { success: false, message: 'Já existe um convidado com esse telefone neste evento' };
  }

  await container.guestRepository.update(guestId, { name: parsed.data.name, phone: normalizedPhone });

  revalidatePath(`/dashboard/events/${eventId}/guests`);
  return { success: true, message: 'Convidado atualizado com sucesso' };
}

export async function sendInvitationToGuestAction(guestId: string, eventId: string) {
  await requireSession();

  try {
    const useCase = new SendInvitationToGuestUseCase();
    await useCase.execute(guestId);
    revalidatePath(`/dashboard/events/${eventId}/guests`);
    return { success: true, message: 'Convite enviado com sucesso' };
  } catch (error) {
    console.error('[send-invitation-to-guest] falha ao enviar convite:', error);
    return { success: false, message: error instanceof Error ? error.message : 'Falha ao enviar convite' };
  }
}

export async function deleteGuestAction(guestId: string, eventId: string) {
  await requireSession();
  const { prisma } = await import('@/infrastructure/database/prisma');
  await prisma.guest.delete({ where: { id: guestId } });
  revalidatePath(`/dashboard/events/${eventId}/guests`);
}
