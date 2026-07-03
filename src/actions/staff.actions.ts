'use server';

import { revalidatePath } from 'next/cache';
import { container } from '@/infrastructure/container';
import { ListGuestsUseCase } from '@/core/use-cases/guests/list-guests.use-case';
import { ManuallyConfirmGuestUseCase } from '@/core/use-cases/guests/manually-confirm-guest.use-case';
import { manualGuestSchema, manualConfirmationSchema } from '@/lib/validations/guest.schema';
import { normalizePhone } from '@/core/services/phone-normalizer.service';

/**
 * Acoes usadas pela pagina da equipe (/equipe/[token]) — sem login, apenas
 * com posse do link. O staffToken concede acesso de cadastro/confirmacao
 * manual a TODOS os convidados de UM evento (mais permissivo que o token
 * publico por convidado usado em /convite). Por isso, cada acao aqui
 * revalida o evento a partir do proprio token a cada chamada (nunca confia
 * em um eventId vindo do cliente) e nunca aceita nenhum dado alem do token
 * como fonte de autorizacao.
 */
async function requireEventByStaffToken(staffToken: string) {
  const event = await container.eventRepository.findByStaffToken(staffToken);
  if (!event) throw new Error('Link inválido ou expirado');
  return event;
}

export async function getEventByStaffTokenAction(staffToken: string) {
  return requireEventByStaffToken(staffToken);
}

export async function listGuestsByStaffTokenAction(staffToken: string, params: { search?: string; page?: number }) {
  const event = await requireEventByStaffToken(staffToken);
  const useCase = new ListGuestsUseCase(container.guestRepository);
  return useCase.execute({ eventId: event.id, search: params.search, page: params.page });
}

export async function createGuestViaStaffTokenAction(staffToken: string, formData: FormData) {
  const event = await requireEventByStaffToken(staffToken);

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

  const existing = await container.guestRepository.findByEventAndPhone(event.id, normalizedPhone);
  if (existing) {
    return { success: false, message: 'Já existe um convidado com esse telefone neste evento' };
  }

  await container.guestRepository.create({
    eventId: event.id,
    name: parsed.data.name,
    phone: normalizedPhone,
    notes: parsed.data.notes,
    origin: 'STAFF',
  });

  revalidatePath(`/equipe/${staffToken}`);
  return { success: true, message: 'Convidado adicionado com sucesso' };
}

export async function manuallyConfirmGuestViaStaffTokenAction(
  staffToken: string,
  guestId: string,
  input: { confirmed: boolean; notifyWhatsapp: boolean; companions: { name: string; age?: number }[] },
) {
  const event = await requireEventByStaffToken(staffToken);

  const guest = await container.guestRepository.findById(guestId);
  if (!guest || guest.eventId !== event.id) {
    return { success: false, message: 'Convidado não encontrado neste evento' };
  }

  const parsed = manualConfirmationSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const useCase = new ManuallyConfirmGuestUseCase();
  const result = await useCase.execute({ guestId, ...parsed.data });

  revalidatePath(`/equipe/${staffToken}`);
  return {
    success: true,
    message: result.status === 'CONFIRMED' ? 'Presença confirmada' : 'Convidado marcado como recusado',
  };
}
