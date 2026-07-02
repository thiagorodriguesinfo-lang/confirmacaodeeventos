import { PrismaConversationRepository } from './database/prisma-conversation.repository';
import { PrismaEventRepository } from './database/prisma-event.repository';
import { PrismaGuestRepository } from './database/prisma-guest.repository';
import { PrismaImportRepository } from './database/prisma-import.repository';
import { PrismaMessageRepository } from './database/prisma-message.repository';
import { PrismaUserRepository } from './database/prisma-user.repository';

/**
 * Composition root simples (sem framework de DI): instancia unica de cada
 * repositorio, injetada nos use-cases. Mantem as camadas de dominio e
 * apresentacao desacopladas da implementacao concreta (Prisma).
 */
export const container = {
  eventRepository: new PrismaEventRepository(),
  guestRepository: new PrismaGuestRepository(),
  importRepository: new PrismaImportRepository(),
  conversationRepository: new PrismaConversationRepository(),
  messageRepository: new PrismaMessageRepository(),
  userRepository: new PrismaUserRepository(),
};
