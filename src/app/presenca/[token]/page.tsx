import { notFound } from 'next/navigation';
import { container } from '@/infrastructure/container';
import { EventInvitationHeader } from '@/components/guests/event-invitation-header';
import { PhoneLookupForm } from './phone-lookup-form';

/**
 * Link genérico de confirmação — um único link por evento (em vez de um
 * link por convidado), pensado para disparo via lista de transmissão do
 * WhatsApp. O convidado se identifica digitando o telefone que recebeu o
 * convite; ver aviso de segurança em public-rsvp.actions.ts.
 */
export default async function GenericRsvpPage({ params }: { params: { token: string } }) {
  const event = await container.eventRepository.findByPublicToken(params.token);
  if (!event) notFound();

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary/5 to-background">
      <div className="mx-auto max-w-lg space-y-6 px-4 py-10">
        <EventInvitationHeader event={event} />
        <PhoneLookupForm eventPublicToken={params.token} />
      </div>
    </div>
  );
}
