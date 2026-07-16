'use client';

import { useState, useTransition } from 'react';
import { lookupGuestByPhoneAction, type RsvpGuestPayload } from '@/actions/public-rsvp.actions';
import { RsvpForm } from '@/components/guests/rsvp-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function PhoneLookupForm({ eventPublicToken }: { eventPublicToken: string }) {
  const [phone, setPhone] = useState('');
  const [guest, setGuest] = useState<RsvpGuestPayload | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLookup() {
    setFeedback(null);
    startTransition(async () => {
      const result = await lookupGuestByPhoneAction(eventPublicToken, phone);
      if (result.found) {
        setGuest(result.guest);
      } else if (result.notRegistered) {
        setFeedback('Não encontramos esse telefone na lista de convidados. Verifique se digitou certo ou fale com a organização do evento.');
      } else {
        setFeedback(result.message ?? 'Telefone inválido');
      }
    });
  }

  if (guest) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground">Olá, {guest.name}!</p>
        <RsvpForm eventPublicToken={eventPublicToken} guest={guest} />
        <button
          className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
          onClick={() => {
            setGuest(null);
            setPhone('');
          }}
        >
          Não é você? Trocar telefone
        </button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <p className="text-sm text-muted-foreground">Digite o telefone que recebeu o convite para confirmar sua presença.</p>
        <Input type="tel" placeholder="(11) 99999-9999" value={phone} onChange={(e) => setPhone(e.target.value)} />
        {feedback && <p className="text-sm text-destructive">{feedback}</p>}
        <Button className="w-full" disabled={isPending || !phone.trim()} onClick={handleLookup}>
          {isPending ? 'Buscando...' : 'Continuar'}
        </Button>
      </CardContent>
    </Card>
  );
}
