import { NextRequest, NextResponse } from 'next/server';
import type { GuestStatus } from '@prisma/client';
import { container } from '@/infrastructure/container';
import { ExportGuestsUseCase } from '@/core/use-cases/export/export-guests.use-case';

/**
 * Exportacao em PDF acessada pela pagina da equipe (sem login) — autorizada
 * pelo staffToken, nao por sessao (diferente de /api/exports/[eventId], que
 * exige NextAuth e por isso nao pode ser usada aqui). Exporta exatamente o
 * que esta filtrado na tela (mesmos parametros de status/busca), para o
 * PDF bater com o que a equipe esta vendo antes de compartilhar no WhatsApp.
 */
export async function GET(req: NextRequest, { params }: { params: { staffToken: string } }) {
  const event = await container.eventRepository.findByStaffToken(params.staffToken);
  if (!event) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 });

  const statuses = req.nextUrl.searchParams.getAll('status') as GuestStatus[];
  const search = req.nextUrl.searchParams.get('search') || undefined;

  const { items } = await container.guestRepository.list({ eventId: event.id, search, pageSize: 5000 });
  const filtered = statuses.length > 0 ? items.filter((guest) => statuses.includes(guest.status)) : items;

  const useCase = new ExportGuestsUseCase();
  const { buffer, contentType, fileName } = await useCase.execute({
    eventId: event.id,
    format: 'pdf',
    order: 'confirmation',
    guestIds: filtered.map((guest) => guest.id),
    titleOverride: statuses.length > 0 ? `Convidados — ${event.name}` : `Lista de convidados — ${event.name}`,
  });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
