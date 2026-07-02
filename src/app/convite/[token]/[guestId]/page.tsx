import { notFound } from 'next/navigation';
import { MapPin, Calendar, Clock } from 'lucide-react';
import { container } from '@/infrastructure/container';
import { prisma } from '@/infrastructure/database/prisma';
import { formatDate } from '@/lib/utils';
import { RsvpForm } from './rsvp-form';

export default async function PublicInvitePage({ params }: { params: { token: string; guestId: string } }) {
  const event = await container.eventRepository.findByPublicToken(params.token);
  if (!event) notFound();

  const guest = await prisma.guest.findFirst({ where: { id: params.guestId, eventId: event.id }, include: { companions: true } });
  if (!guest) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
        {event.invitationImage && (
          <div className="overflow-hidden rounded-2xl shadow-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={event.invitationImage} alt={event.name} className="h-64 w-full object-cover" />
          </div>
        )}

        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
          <p className="mt-1 text-muted-foreground">Você foi convidado(a), {guest.name}!</p>

          <div className="mt-6 space-y-3 text-left text-sm">
            <div className="flex items-center gap-3">
              <Calendar className="h-4 w-4 text-primary" />
              <span>{formatDate(event.date)}</span>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="h-4 w-4 text-primary" />
              <span>{event.time}</span>
            </div>
            <div className="flex items-center gap-3">
              <MapPin className="h-4 w-4 text-primary" />
              <span>
                {event.location}
                {event.address ? ` — ${event.address}` : ''}
              </span>
            </div>
          </div>

          {event.googleMapsUrl && (
            <a
              href={event.googleMapsUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4"
            >
              Ver no Google Maps
            </a>
          )}

          {event.description && <p className="mt-4 text-sm text-muted-foreground">{event.description}</p>}
        </div>

        <RsvpForm
          eventPublicToken={params.token}
          guest={{
            id: guest.id,
            status: guest.status,
            confirmedCount: guest.confirmedCount,
            companions: guest.companions.map((c) => ({ name: c.name, age: c.age })),
          }}
        />
      </div>
    </div>
  );
}
