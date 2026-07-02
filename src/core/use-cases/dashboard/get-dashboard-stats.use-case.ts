import { prisma } from '@/infrastructure/database/prisma';

export interface DashboardStats {
  totalGuests: number;
  pending: number;
  confirmed: number;
  declined: number;
  noResponse: number;
  messagesSent: number;
  messagesDelivered: number;
  messagesRead: number;
  peopleConfirmed: number;
  confirmationRate: number; // 0-100
  evolutionByDay: { date: string; confirmed: number; declined: number }[];
  responseBreakdown: { status: string; count: number }[];
}

/**
 * Consulta de leitura (read-model) para o painel administrativo. Como e
 * usada apenas para exibicao (nao ha regra de negocio a proteger aqui),
 * conversa diretamente com o Prisma em vez de passar por um repositorio —
 * mantendo o restante do dominio (escrita) isolado via Repository Pattern.
 */
export class GetDashboardStatsUseCase {
  async execute(eventId: string): Promise<DashboardStats> {
    const [totalGuests, statusGroups, peopleConfirmedAgg, messageGroups, dailyResponses] = await Promise.all([
      prisma.guest.count({ where: { eventId } }),
      prisma.guest.groupBy({ by: ['status'], where: { eventId }, _count: { _all: true } }),
      prisma.guest.aggregate({ where: { eventId, status: 'CONFIRMED' }, _sum: { confirmedCount: true } }),
      prisma.message.groupBy({
        by: ['status'],
        where: { guest: { eventId }, direction: 'OUTBOUND' },
        _count: { _all: true },
      }),
      prisma.guest.findMany({
        where: { eventId, respondedAt: { not: null } },
        select: { respondedAt: true, status: true },
      }),
    ]);

    const countByStatus = (status: string) => statusGroups.find((g) => g.status === status)?._count._all ?? 0;

    const pending = countByStatus('PENDING') + countByStatus('SENT');
    const confirmed = countByStatus('CONFIRMED');
    const declined = countByStatus('DECLINED');
    const noResponse = countByStatus('NO_RESPONSE');

    const messagesSent = messageGroups.reduce((acc, g) => acc + g._count._all, 0);
    const messagesDelivered = messageGroups
      .filter((g) => ['DELIVERED', 'READ'].includes(g.status))
      .reduce((acc, g) => acc + g._count._all, 0);
    const messagesRead = messageGroups.find((g) => g.status === 'READ')?._count._all ?? 0;

    const evolutionMap = new Map<string, { confirmed: number; declined: number }>();
    for (const g of dailyResponses) {
      if (!g.respondedAt) continue;
      const day = g.respondedAt.toISOString().slice(0, 10);
      const entry = evolutionMap.get(day) ?? { confirmed: 0, declined: 0 };
      if (g.status === 'CONFIRMED') entry.confirmed++;
      if (g.status === 'DECLINED') entry.declined++;
      evolutionMap.set(day, entry);
    }

    const evolutionByDay = Array.from(evolutionMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }));

    return {
      totalGuests,
      pending,
      confirmed,
      declined,
      noResponse,
      messagesSent,
      messagesDelivered,
      messagesRead,
      peopleConfirmed: peopleConfirmedAgg._sum.confirmedCount ?? 0,
      confirmationRate: totalGuests > 0 ? Math.round(((confirmed + declined) / totalGuests) * 100) : 0,
      evolutionByDay,
      responseBreakdown: statusGroups.map((g) => ({ status: g.status, count: g._count._all })),
    };
  }
}
