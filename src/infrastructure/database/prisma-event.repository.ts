import type { EventStatus } from '@prisma/client';
import type { CreateEventInput, EventRepository, UpdateEventInput } from '@/core/repositories/event.repository';
import { prisma } from './prisma';

export class PrismaEventRepository implements EventRepository {
  create(input: CreateEventInput) {
    return prisma.event.create({ data: { ...input, status: 'DRAFT' } });
  }

  update(id: string, input: UpdateEventInput) {
    return prisma.event.update({ where: { id }, data: input });
  }

  findById(id: string) {
    return prisma.event.findUnique({ where: { id } });
  }

  findByPublicToken(token: string) {
    return prisma.event.findUnique({ where: { publicToken: token } });
  }

  list(filter?: { ownerId?: string; status?: EventStatus }) {
    return prisma.event.findMany({
      where: { ownerId: filter?.ownerId, status: filter?.status },
      orderBy: { date: 'desc' },
    });
  }

  async delete(id: string) {
    await prisma.event.delete({ where: { id } });
  }

  countGuestsAggregate(eventId: string) {
    return prisma.guest.groupBy({
      by: ['status'],
      where: { eventId },
      _count: { _all: true },
      _sum: { confirmedCount: true },
    }) as any;
  }
}
