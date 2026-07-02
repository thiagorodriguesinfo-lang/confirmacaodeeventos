import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ExportGuestsUseCase, type ExportFormat, type ExportOrder } from '@/core/use-cases/export/export-guests.use-case';

export async function GET(req: NextRequest, { params }: { params: { eventId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });

  const format = (req.nextUrl.searchParams.get('format') ?? 'xlsx') as ExportFormat;
  const order = (req.nextUrl.searchParams.get('order') ?? 'alphabetical') as ExportOrder;

  const useCase = new ExportGuestsUseCase();
  const { buffer, contentType, fileName } = await useCase.execute({ eventId: params.eventId, format, order });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
