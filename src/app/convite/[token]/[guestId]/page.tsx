import { notFound } from 'next/navigation';
import { container } from '@/infrastructure/container';
import { prisma } from '@/infrastructure/database/prisma';
import { RsvpForm } from '@/components/guests/rsvp-form';
import { EventInvitationHeader } from '@/components/guests/event-invitation-header';

export default async function PublicInvitePage({ params }: { params: { token: string; guestId: string } }) {
  const event = await container.eventRepository.findByPublicToken(params.token);
  if (!event) notFound();

  const guest = await prisma.guest.findFirst({ where: { id: params.guestId, eventId: event.id }, include: { companions: true } });
  if (!guest) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <EventInvitationHeader event={event} greeting={`Você foi convidado(a), ${guest.name}!`} />

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
