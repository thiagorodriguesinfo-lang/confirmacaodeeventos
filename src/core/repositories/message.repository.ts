import type { Message, MessageDirection, MessageStatus, MessageType } from '@prisma/client';

export interface LogMessageInput {
  guestId: string;
  direction: MessageDirection;
  type: MessageType;
  status?: MessageStatus;
  content: string;
  mediaUrl?: string;
  providerMessageId?: string;
  providerName?: string;
  errorMessage?: string;
}

export interface MessageRepository {
  log(input: LogMessageInput): Promise<Message>;
  updateStatusByProviderMessageId(
    providerMessageId: string,
    status: MessageStatus,
    timestamps?: { deliveredAt?: Date; readAt?: Date },
  ): Promise<Message | null>;
  listByGuest(guestId: string): Promise<Message[]>;
}
