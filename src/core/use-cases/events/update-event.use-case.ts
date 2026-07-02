import type { EventRepository, UpdateEventInput } from '@/core/repositories/event.repository';

export class UpdateEventUseCase {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(id: string, input: UpdateEventInput) {
    const event = await this.eventRepository.findById(id);
    if (!event) throw new Error('Evento nao encontrado');
    return this.eventRepository.update(id, input);
  }
}
