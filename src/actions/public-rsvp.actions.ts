'use server';

import { revalidatePath } from 'next/cache';
import { SubmitPublicRsvpUseCase } from '@/core/use-cases/guests/submit-public-rsvp.use-case';
import { container } from '@/infrastructure/container';
import { normalizePhone } from '@/core/services/phone-normalizer.service';

export interface SubmitPublicRsvpPayload {
  eventPublicToken: string;
  guestId: string;
  confirmed: boolean;
  companions: { name: string; age?: number }[];
}

export async function submitPublicRsvpAction(payload: SubmitPublicRsvpPayload) {
  try {
    const useCase = new SubmitPublicRsvpUseCase();
    const result = await useCase.execute(payload);
    revalidatePath(`/convite/${payload.eventPublicToken}/${payload.guestId}`);
    return { success: true, status: result.status };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Erro ao confirmar presença' };
  }
}

export interface RsvpGuestPayload {
  id: string;
  name: string;
  status: string;
  confirmedCount: number;
  companions: { name: string; age: number | null }[];
}

/**
 * Link genérico por evento (/presenca/[token]) — em vez de um link único
 * por convidado, o próprio convidado se identifica digitando o telefone
 * que recebeu o convite. Pensado para disparo via lista de transmissão do
 * WhatsApp (um único link para todo mundo, sem precisar de disparo
 * individual). Nao ha token/senha por convidado: quem souber o telefone
 * de alguém consegue confirmar/alterar a resposta em nome dela — mesmo
 * nível de proteção do link individual atual (nao criptografado, so
 * "obscuro"), aceitável para o caso de uso.
 */
export async function lookupGuestByPhoneAction(eventPublicToken: string, phone: string) {
  const event = await container.eventRepository.findByPublicToken(eventPublicToken);
  if (!event) return { found: false as const, message: 'Evento não encontrado' };

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { found: false as const, message: 'Telefone inválido' };

  const guest = await container.guestRepository.findByEventAndPhone(event.id, normalizedPhone);
  if (!guest) return { found: false as const, notRegistered: true as const, normalizedPhone };

  const full = await container.guestRepository.findById(guest.id);
  if (!full) return { found: false as const, message: 'Convidado não encontrado' };

  const rsvpGuest: RsvpGuestPayload = {
    id: full.id,
    name: full.name,
    status: full.status,
    confirmedCount: full.confirmedCount,
    companions: full.companions.map((c) => ({ name: c.name, age: c.age })),
  };
  return { found: true as const, guest: rsvpGuest };
}

/** Cadastra quem confirmou pelo link genérico mas ainda não estava na lista de convidados. */
export async function registerGuestByPhoneAction(eventPublicToken: string, name: string, phone: string) {
  const event = await container.eventRepository.findByPublicToken(eventPublicToken);
  if (!event) return { success: false as const, message: 'Evento não encontrado' };

  if (name.trim().length < 2) return { success: false as const, message: 'Informe seu nome' };

  const normalizedPhone = normalizePhone(phone);
  if (!normalizedPhone) return { success: false as const, message: 'Telefone inválido' };

  const existing = await container.guestRepository.findByEventAndPhone(event.id, normalizedPhone);
  if (existing) {
    const rsvpGuest: RsvpGuestPayload = {
      id: existing.id,
      name: existing.name,
      status: existing.status,
      confirmedCount: existing.confirmedCount,
      companions: [],
    };
    return { success: true as const, guest: rsvpGuest };
  }

  const guest = await container.guestRepository.create({
    eventId: event.id,
    name: name.trim(),
    phone: normalizedPhone,
    origin: 'PUBLIC_PAGE',
  });

  const rsvpGuest: RsvpGuestPayload = {
    id: guest.id,
    name: guest.name,
    status: guest.status,
    confirmedCount: guest.confirmedCount,
    companions: [],
  };
  return { success: true as const, guest: rsvpGuest };
}
