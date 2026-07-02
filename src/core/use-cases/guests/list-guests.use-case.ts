import type { GuestFilter, GuestRepository } from '@/core/repositories/guest.repository';

export class ListGuestsUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  execute(filter: GuestFilter) {
    return this.guestRepository.list(filter);
  }
}
