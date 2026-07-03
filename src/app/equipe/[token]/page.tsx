import { notFound } from 'next/navigation';
import { container } from '@/infrastructure/container';
import { listGuestsByStaffTokenAction } from '@/actions/staff.actions';
import { StaffSearch } from './staff-search';
import { StaffAddGuestForm } from './staff-add-guest-form';
import { StaffGuestCard } from './staff-guest-card';

export default async function StaffPage({
  params,
  searchParams,
}: {
  params: { token: string };
  searchParams: { search?: string; page?: string };
}) {
  const event = await container.eventRepository.findByStaffToken(params.token);
  if (!event) notFound();

  const page = Number(searchParams.page) || 1;
  const { items, total } = await listGuestsByStaffTokenAction(params.token, { search: searchParams.search, page });

  return (
    <div className="mx-auto max-w-lg space-y-4 p-4 pb-16">
      <header className="space-y-1 pt-6 text-center">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Equipe do evento</p>
        <h1 className="text-xl font-semibold">{event.name}</h1>
        <p className="text-sm text-muted-foreground">
          {new Date(event.date).toLocaleDateString('pt-BR')} às {event.time} — {event.location}
        </p>
      </header>

      <StaffAddGuestForm staffToken={params.token} />

      <StaffSearch />

      <p className="text-sm text-muted-foreground">{total} convidado(s)</p>

      <div className="space-y-3">
        {items.map((guest) => (
          <StaffGuestCard key={guest.id} staffToken={params.token} guest={guest} />
        ))}
        {items.length === 0 && (
          <p className="py-10 text-center text-sm text-muted-foreground">Nenhum convidado encontrado.</p>
        )}
      </div>
    </div>
  );
}
