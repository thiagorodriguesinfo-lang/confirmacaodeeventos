import { z } from 'zod';

export const manualGuestSchema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  phone: z.string().min(8, 'Informe um telefone valido'),
  notes: z.string().optional(),
});

export type ManualGuestSchema = z.infer<typeof manualGuestSchema>;

export const editGuestSchema = z.object({
  name: z.string().min(2, 'Informe o nome'),
  phone: z.string().min(8, 'Informe um telefone valido'),
});

export const dispatchGuestsSchema = z.object({
  eventId: z.string().cuid(),
  ratePerMinute: z.coerce.number().int().min(1).max(1000),
  guestStatusFilter: z.array(z.enum(['PENDING', 'SENT', 'CONFIRMED', 'DECLINED', 'NO_RESPONSE'])).optional(),
  guestIds: z.array(z.string().cuid()).optional(),
});

export const manualConfirmationSchema = z.object({
  confirmed: z.boolean(),
  notifyWhatsapp: z.boolean().default(true),
  companions: z
    .array(
      z.object({
        name: z.string().min(1, 'Informe o nome do acompanhante'),
        age: z.coerce.number().int().min(0).max(120).optional(),
      }),
    )
    .default([]),
});

export const publicRsvpSchema = z.object({
  eventPublicToken: z.string(),
  name: z.string().min(2),
  phone: z.string().min(8),
  confirmed: z.boolean(),
  companions: z
    .array(
      z.object({
        name: z.string().min(1),
        age: z.coerce.number().int().min(0).max(120).optional(),
      }),
    )
    .default([]),
});
