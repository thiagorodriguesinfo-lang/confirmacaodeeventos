import type { ChatbotStep, Prisma } from '@prisma/client';
import type { ConversationRepository } from '@/core/repositories/conversation.repository';
import { prisma } from './prisma';

export class PrismaConversationRepository implements ConversationRepository {
  async getOrCreate(guestId: string) {
    return prisma.conversationState.upsert({
      where: { guestId },
      update: {},
      create: { guestId, currentStep: 'NOT_STARTED', context: {} },
    });
  }

  update(guestId: string, data: { currentStep: ChatbotStep; context: object; lastMessageAt: Date; attemptCount?: number }) {
    return prisma.conversationState.update({
      where: { guestId },
      data: {
        currentStep: data.currentStep,
        context: data.context as unknown as Prisma.InputJsonValue,
        lastMessageAt: data.lastMessageAt,
        attemptCount: data.attemptCount,
      },
    });
  }
}
