import { notFound } from 'next/navigation';
import type { GuestStatus } from '@prisma/client';
import { container } from '@/infrastructure/container';
import { listGuestsAction } from '@/actions/guest.actions';
import { Card, CardContent } from '@/components/ui/card';
import { GuestStatusBadge } from '@/components/dashboard/guest-status-badge';
import { formatPhone } from '@/lib/utils';
import { GuestFilters } from './guest-filters';
import { AddGuestForm } from './add-guest-form';
import { GuestRowActions } from './guest-row-actions';
import { ExportButtons } from './export-buttons';

export default async function EventGuestsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { status?: string; search?: string; page?: string };
}) {
  const event = await container.eventRepository.findById(params.id);
  if (!event) notFound();

  const page = Number(searchParams.page) || 1;
  const { items, total } = await listGuestsAction({
    eventId: params.id,
    status: (searchParams.status as GuestStatus) || undefined,
    search: searchParams.search,
    page,
    // A tabela nao tem paginacao na UI (so rolagem) — traz todo mundo de
    // uma vez, senao so os 25 primeiros (limite padrao) aparecem.
    pageSize: 2000,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Convidados</h1>
          <p className="text-sm text-muted-foreground">{total} convidados neste evento</p>
        </div>
        <ExportButtons eventId={params.id} />
      </div>

      <AddGuestForm eventId={params.id} />
      <GuestFilters />

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b bg-muted/40 text-left text-xs uppercase text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 font-medium">Nome</th>
                  <th className="px-4 py-3 font-medium">Telefone</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Pessoas</th>
                  <th className="px-4 py-3 font-medium">Origem</th>
                  <th className="px-4 py-3 font-medium">Respondido em</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.map((guest) => (
                  <tr key={guest.id} className="border-b last:border-0 hover:bg-muted/20">
                    <td className="px-4 py-3 font-medium">{guest.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatPhone(guest.phone)}</td>
                    <td className="px-4 py-3">
                      <GuestStatusBadge status={guest.status} />
                    </td>
                    <td className="px-4 py-3">
                      {guest.status === 'CONFIRMED' ? (
                        <div>
                          <span className="font-medium">{guest.confirmedCount}</span>
                          {guest.companions.length > 0 && (
                            <p className="text-xs text-muted-foreground">
                              {guest.companions.map((c) => (c.age !== null ? `${c.name} (${c.age})` : c.name)).join(', ')}
                            </p>
                          )}
                        </div>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{guest.origin}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {guest.respondedAt ? new Date(guest.respondedAt).toLocaleString('pt-BR') : '-'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <GuestRowActions
                        guestId={guest.id}
                        eventId={params.id}
                        guestName={guest.name}
                        guestPhone={guest.phone}
                        status={guest.status}
                        companions={guest.companions}
                      />
                    </td>
                  </tr>
                ))}
                {items.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      Nenhum convidado encontrado com os filtros atuais.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
