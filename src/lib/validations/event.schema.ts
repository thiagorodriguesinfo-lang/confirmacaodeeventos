import { z } from 'zod';

export const createEventSchema = z.object({
  name: z.string().min(2, 'Informe o nome do evento'),
  date: z.coerce.date({ errorMap: () => ({ message: 'Data invalida' }) }),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Horario invalido (HH:mm)'),
  location: z.string().min(2, 'Informe o local'),
  address: z.string().optional(),
  description: z.string().optional(),
  invitationImage: z.string().url().optional().or(z.literal('')),
  qrCodeUrl: z.string().url().optional().or(z.literal('')),
  googleMapsUrl: z.string().url().optional().or(z.literal('')),
  maxGuests: z.coerce.number().int().positive().optional(),
  defaultMessage: z.string().optional(),
  thankYouMessage: z.string().optional(),
  reminderMessage: z.string().optional(),
  declinedMessage: z.string().optional(),
});

export type CreateEventSchema = z.infer<typeof createEventSchema>;

export const updateEventStatusSchema = z.object({
  status: z.enum(['DRAFT', 'ACTIVE', 'PAUSED', 'FINISHED', 'CANCELLED']),
});
