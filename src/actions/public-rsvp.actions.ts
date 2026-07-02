'use server';

import { revalidatePath } from 'next/cache';
import { SubmitPublicRsvpUseCase } from '@/core/use-cases/guests/submit-public-rsvp.use-case';

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
