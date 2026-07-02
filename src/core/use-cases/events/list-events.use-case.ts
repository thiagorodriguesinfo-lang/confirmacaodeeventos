import type { EventStatus } from '@prisma/client';
import type { EventRepository } from '@/core/repositories/event.repository';

export class ListEventsUseCase {
  constructor(private readonly eventRepository: EventRepository) {}

  execute(filter?: { ownerId?: string; status?: EventStatus }) {
    return this.eventRepository.list(filter);
  }
}
