import type { EventRepository } from '@/core/repositories/event.repository';
import {
  DEFAULT_DECLINED_MESSAGE,
  DEFAULT_INVITE_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  DEFAULT_THANK_YOU_MESSAGE,
} from '@/core/services/message-template.service';
import type { CreateEventDto } from '@/core/dtos/event.dto';

export class CreateEventUseCase {
  constructor(private readonly eventRepository: EventRepository) {}

  async execute(dto: CreateEventDto & { ownerId: string }) {
    return this.eventRepository.create({
      ...dto,
      defaultMessage: dto.defaultMessage || DEFAULT_INVITE_MESSAGE,
      thankYouMessage: dto.thankYouMessage || DEFAULT_THANK_YOU_MESSAGE,
      reminderMessage: dto.reminderMessage || DEFAULT_REMINDER_MESSAGE,
      declinedMessage: dto.declinedMessage || DEFAULT_DECLINED_MESSAGE,
    });
  }
}
