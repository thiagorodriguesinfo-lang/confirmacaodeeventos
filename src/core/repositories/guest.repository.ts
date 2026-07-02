import type { ChatbotStep, Guest, GuestOrigin, GuestStatus } from '@prisma/client';

export interface CreateGuestInput {
  eventId: string;
  name: string;
  phone: string;
  origin: GuestOrigin;
  notes?: string;
  needsReview?: boolean;
  importId?: string;
}

export interface GuestFilter {
  eventId: string;
  status?: GuestStatus;
  origin?: GuestOrigin;
  needsReview?: boolean;
  search?: string; // busca por nome ou telefone
  page?: number;
  pageSize?: number;
}

export interface GuestWithRelations extends Guest {
  companions: { id: string; name: string; age: number | null }[];
}

export interface GuestRepository {
  create(input: CreateGuestInput): Promise<Guest>;
  createMany(inputs: CreateGuestInput[]): Promise<{ count: number }>;
  update(id: string, data: Partial<Guest>): Promise<Guest>;
  findById(id: string): Promise<GuestWithRelations | null>;
  findByEventAndPhone(eventId: string, phone: string): Promise<Guest | null>;
  findByPhoneAcrossEvents(phone: string): Promise<Guest[]>;
  list(filter: GuestFilter): Promise<{ items: GuestWithRelations[]; total: number }>;
  updateChatbotStep(id: string, step: ChatbotStep): Promise<Guest>;
  addTimelineEvent(guestId: string, type: string, payload?: Record<string, unknown>): Promise<void>;
}
