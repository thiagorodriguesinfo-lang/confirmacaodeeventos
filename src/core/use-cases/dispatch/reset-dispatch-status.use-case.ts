import { prisma } from '@/infrastructure/database/prisma';

/**
 * Volta os convidados que ja receberam convite mas ainda nao responderam
 * (SENT/NO_RESPONSE) para PENDING, para permitir um novo disparo em massa
 * do zero. Quem ja confirmou ou recusou presenca NAO e alterado — ja
 * respondeu, reenviar seria confuso.
 */
export class ResetDispatchStatusUseCase {
  async execute(eventId: string) {
    const result = await prisma.guest.updateMany({
      where: { eventId, status: { in: ['SENT', 'NO_RESPONSE'] } },
      data: { status: 'PENDING', sentAt: null, chatbotStep: 'NOT_STARTED' },
    });
    return { count: result.count };
  }
}
