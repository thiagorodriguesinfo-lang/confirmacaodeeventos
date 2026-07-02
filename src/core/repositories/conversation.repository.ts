import type { ChatbotStep, ConversationState } from '@prisma/client';

export interface ConversationRepository {
  getOrCreate(guestId: string): Promise<ConversationState>;
  update(
    guestId: string,
    data: { currentStep: ChatbotStep; context: object; lastMessageAt: Date; attemptCount?: number },
  ): Promise<ConversationState>;
}
