import type { MessageStatus } from '@prisma/client';
import type { LogMessageInput, MessageRepository } from '@/core/repositories/message.repository';
import { prisma } from './prisma';

export class PrismaMessageRepository implements MessageRepository {
  log(input: LogMessageInput) {
    return prisma.message.create({
      data: {
        ...input,
        status: input.status ?? 'QUEUED',
        sentAt: input.direction === 'OUTBOUND' ? new Date() : undefined,
      },
    });
  }

  async updateStatusByProviderMessageId(
    providerMessageId: string,
    status: MessageStatus,
    timestamps?: { deliveredAt?: Date; readAt?: Date },
  ) {
    const existing = await prisma.message.findUnique({ where: { providerMessageId } });
    if (!existing) return null;

    return prisma.message.update({
      where: { providerMessageId },
      data: { status, deliveredAt: timestamps?.deliveredAt, readAt: timestamps?.readAt },
    });
  }

  listByGuest(guestId: string) {
    return prisma.message.findMany({ where: { guestId }, orderBy: { createdAt: 'asc' } });
  }
}
