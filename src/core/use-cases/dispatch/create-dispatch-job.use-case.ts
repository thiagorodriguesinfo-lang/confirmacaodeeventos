import type { GuestStatus } from '@prisma/client';
import { prisma } from '@/infrastructure/database/prisma';

export interface CreateDispatchJobInput {
  eventId: string;
  ratePerMinute: number;
  createdById?: string;
  /** Se omitido, envia para todos os convidados do evento. */
  guestStatusFilter?: GuestStatus[];
  guestIds?: string[];
}

/**
 * Cria um job de disparo em lote (Modulo 4). O envio efetivo e feito de
 * forma assincrona pelo worker (infrastructure/queue/dispatch-worker.ts),
 * que respeita o rate limit configurado e pode ser pausado/retomado/cancelado
 * a qualquer momento sem perder o progresso.
 */
export class CreateDispatchJobUseCase {
  async execute(input: CreateDispatchJobInput) {
    const where = {
      eventId: input.eventId,
      ...(input.guestIds ? { id: { in: input.guestIds } } : {}),
      ...(input.guestStatusFilter ? { status: { in: input.guestStatusFilter } } : {}),
    };

    const guests = await prisma.guest.findMany({ where, select: { id: true } });
    if (guests.length === 0) throw new Error('Nenhum convidado corresponde aos criterios selecionados');

    return prisma.dispatchJob.create({
      data: {
        eventId: input.eventId,
        ratePerMinute: input.ratePerMinute,
        filter: where as object,
        totalTargets: guests.length,
        createdById: input.createdById,
        status: 'QUEUED',
        targets: { createMany: { data: guests.map((g) => ({ guestId: g.id })) } },
      },
      include: { targets: true },
    });
  }
}
