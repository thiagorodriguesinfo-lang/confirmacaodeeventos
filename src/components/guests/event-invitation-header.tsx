import { Calendar, Clock, MapPin } from 'lucide-react';
import { formatDate } from '@/lib/utils';

interface EventInvitationHeaderEvent {
  name: string;
  date: Date;
  time: string;
  location: string;
  address: string | null;
  googleMapsUrl: string | null;
  description: string | null;
  invitationImage: string | null;
}

export function EventInvitationHeader({ event, greeting }: { event: EventInvitationHeaderEvent; greeting?: string }) {
  return (
    <>
      {event.invitationImage && (
        <div className="overflow-hidden rounded-2xl shadow-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={event.invitationImage} alt={event.name} className="h-64 w-full object-cover" />
        </div>
      )}

      <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
        <h1 className="text-2xl font-bold tracking-tight">{event.name}</h1>
        <p className="mt-1 text-muted-foreground">{greeting ?? 'Confirme sua presença'}</p>

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
    </>
  );
}
