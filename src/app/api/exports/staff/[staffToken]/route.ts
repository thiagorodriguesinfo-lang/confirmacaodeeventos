import { NextRequest, NextResponse } from 'next/server';
import { container } from '@/infrastructure/container';
import { ExportGuestsUseCase } from '@/core/use-cases/export/export-guests.use-case';

/**
 * Exportacao em PDF acessada pela pagina da equipe (sem login) — autorizada
 * pelo staffToken, nao por sessao (diferente de /api/exports/[eventId], que
 * exige NextAuth e por isso nao pode ser usada aqui).
 *
 * Recebe a lista de guestIds diretamente da pagina (ja filtrada por
 * status/busca ali), em vez de re-buscar e re-filtrar aqui — evita
 * qualquer divergencia entre o que a equipe ve na tela e o que sai no PDF.
 * Parametro guestIds ausente = exporta todo mundo do evento.
 */
export async function GET(req: NextRequest, { params }: { params: { staffToken: string } }) {
  try {
    const event = await container.eventRepository.findByStaffToken(params.staffToken);
    if (!event) return NextResponse.json({ error: 'Link inválido ou expirado' }, { status: 404 });

    const guestIdsParam = req.nextUrl.searchParams.get('guestIds');
    const guestIds = guestIdsParam === null ? undefined : guestIdsParam.split(',').filter(Boolean);

    const useCase = new ExportGuestsUseCase();
    const { buffer, contentType, fileName } = await useCase.execute({
      eventId: event.id,
      format: 'pdf',
      order: 'confirmation',
      guestIds,
      titleOverride: guestIds ? `Convidados — ${event.name}` : `Lista de convidados — ${event.name}`,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('[exports/staff] falha ao gerar PDF:', error);
    return NextResponse.json({ error: 'Falha ao gerar o PDF' }, { status: 500 });
  }
}
