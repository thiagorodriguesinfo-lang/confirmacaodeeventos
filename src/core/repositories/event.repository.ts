import type { Event, EventStatus, Prisma } from '@prisma/client';

export interface CreateEventInput {
  name: string;
  date: Date;
  time: string;
  location: string;
  address?: string;
  description?: string;
  invitationImage?: string;
  qrCodeUrl?: string;
  googleMapsUrl?: string;
  maxGuests?: number;
  defaultMessage?: string;
  thankYouMessage?: string;
  reminderMessage?: string;
  declinedMessage?: string;
  ownerId: string;
}

export type UpdateEventInput = Partial<Omit<CreateEventInput, 'ownerId'>> & { status?: EventStatus };

/**
 * Contrato de persistencia de Eventos. A camada de use-case depende apenas
 * desta interface — a implementacao concreta (Prisma) vive em infrastructure/.
 */
export interface EventRepository {
  create(input: CreateEventInput): Promise<Event>;
  update(id: string, input: UpdateEventInput): Promise<Event>;
  findById(id: string): Promise<Event | null>;
  findByPublicToken(token: string): Promise<Event | null>;
  findByStaffToken(token: string): Promise<Event | null>;
  regenerateStaffToken(id: string): Promise<Event>;
  list(filter?: { ownerId?: string; status?: EventStatus }): Promise<Event[]>;
  delete(id: string): Promise<void>;
  countGuestsAggregate(eventId: string): Promise<Prisma.GuestGroupByOutputType[]>;
}
