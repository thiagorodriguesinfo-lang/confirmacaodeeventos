import type { ChatbotStep, Guest, Prisma } from '@prisma/client';
import type { CreateGuestInput, GuestFilter, GuestRepository, GuestWithRelations } from '@/core/repositories/guest.repository';
import { prisma } from './prisma';

const guestInclude = {
  companions: { select: { id: true, name: true, age: true } },
} satisfies Prisma.GuestInclude;

export class PrismaGuestRepository implements GuestRepository {
  create(input: CreateGuestInput) {
    return prisma.guest.create({ data: input });
  }

  async createMany(inputs: CreateGuestInput[]) {
    return prisma.guest.createMany({ data: inputs, skipDuplicates: true });
  }

  update(id: string, data: Partial<Guest>) {
    return prisma.guest.update({ where: { id }, data: data as Prisma.GuestUpdateInput });
  }

  findById(id: string): Promise<GuestWithRelations | null> {
    return prisma.guest.findUnique({ where: { id }, include: guestInclude });
  }

  findByEventAndPhone(eventId: string, phone: string) {
    return prisma.guest.findUnique({ where: { eventId_phone: { eventId, phone } } });
  }

  findByPhoneAcrossEvents(phone: string) {
    return prisma.guest.findMany({ where: { phone } });
  }

  async list(filter: GuestFilter) {
    const page = filter.page ?? 1;
    const pageSize = filter.pageSize ?? 25;

    const where: Prisma.GuestWhereInput = {
      eventId: filter.eventId,
      status: filter.status,
      origin: filter.origin,
      needsReview: filter.needsReview,
      ...(filter.search
        ? {
            OR: [
              { name: { contains: filter.search, mode: 'insensitive' } },
              { phone: { contains: filter.search } },
            ],
          }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.guest.findMany({
        where,
        include: guestInclude,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.guest.count({ where }),
    ]);

    return { items, total };
  }

  updateChatbotStep(id: string, step: ChatbotStep) {
    return prisma.guest.update({ where: { id }, data: { chatbotStep: step } });
  }

  async addTimelineEvent(guestId: string, type: string, payload?: Record<string, unknown>) {
    await prisma.timelineEvent.create({ data: { guestId, type, payload: payload as Prisma.InputJsonValue } });
  }
}
