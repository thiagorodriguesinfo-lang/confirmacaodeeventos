'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { container } from '@/infrastructure/container';
import { CreateEventUseCase } from '@/core/use-cases/events/create-event.use-case';
import { UpdateEventUseCase } from '@/core/use-cases/events/update-event.use-case';
import { ListEventsUseCase } from '@/core/use-cases/events/list-events.use-case';
import { createEventSchema } from '@/lib/validations/event.schema';
import type { EventStatus } from '@prisma/client';

async function requireSession() {
  const session = await getServerSession(authOptions);
  if (!session?.user) throw new Error('Não autenticado');
  return session;
}

export async function createEventAction(formData: FormData) {
  const session = await requireSession();

  const parsed = createEventSchema.safeParse({
    name: formData.get('name'),
    date: formData.get('date'),
    time: formData.get('time'),
    location: formData.get('location'),
    address: formData.get('address') || undefined,
    description: formData.get('description') || undefined,
    invitationImage: formData.get('invitationImage') || undefined,
    googleMapsUrl: formData.get('googleMapsUrl') || undefined,
    maxGuests: formData.get('maxGuests') || undefined,
    defaultMessage: formData.get('defaultMessage') || undefined,
    thankYouMessage: formData.get('thankYouMessage') || undefined,
    reminderMessage: formData.get('reminderMessage') || undefined,
    declinedMessage: formData.get('declinedMessage') || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const useCase = new CreateEventUseCase(container.eventRepository);
  const event = await useCase.execute({ ...parsed.data, ownerId: session.user.id });

  revalidatePath('/dashboard');
  redirect(`/dashboard/events/${event.id}`);
}

export async function updateEventStatusAction(eventId: string, status: EventStatus) {
  await requireSession();
  const useCase = new UpdateEventUseCase(container.eventRepository);
  await useCase.execute(eventId, { status });
  revalidatePath(`/dashboard/events/${eventId}`);
}

export async function updateEventSettingsAction(eventId: string, formData: FormData) {
  await requireSession();

  const parsed = createEventSchema.partial().safeParse({
    name: formData.get('name') || undefined,
    date: formData.get('date') || undefined,
    time: formData.get('time') || undefined,
    location: formData.get('location') || undefined,
    address: formData.get('address') || undefined,
    description: formData.get('description') || undefined,
    invitationImage: formData.get('invitationImage') || undefined,
    googleMapsUrl: formData.get('googleMapsUrl') || undefined,
    maxGuests: formData.get('maxGuests') || undefined,
    defaultMessage: formData.get('defaultMessage') || undefined,
    thankYouMessage: formData.get('thankYouMessage') || undefined,
    reminderMessage: formData.get('reminderMessage') || undefined,
    declinedMessage: formData.get('declinedMessage') || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const useCase = new UpdateEventUseCase(container.eventRepository);
  await useCase.execute(eventId, parsed.data);
  revalidatePath(`/dashboard/events/${eventId}`);
  revalidatePath(`/dashboard/events/${eventId}/settings`);
  return { success: true, message: 'Evento atualizado com sucesso' };
}

export async function regenerateStaffTokenAction(eventId: string) {
  await requireSession();
  await container.eventRepository.regenerateStaffToken(eventId);
  revalidatePath(`/dashboard/events/${eventId}/settings`);
  return { success: true, message: 'Novo link gerado — o link anterior deixou de funcionar' };
}

export async function listMyEventsAction() {
  await requireSession();
  // Operadores e administradores compartilham a mesma visao de eventos —
  // o campo ownerId serve para auditoria (quem criou), nao para isolamento.
  const useCase = new ListEventsUseCase(container.eventRepository);
  return useCase.execute();
}
