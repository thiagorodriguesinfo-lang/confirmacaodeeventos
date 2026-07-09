'use client';

import { useState, useTransition } from 'react';
import { lookupGuestByPhoneAction, registerGuestByPhoneAction, type RsvpGuestPayload } from '@/actions/public-rsvp.actions';
import { RsvpForm } from '@/components/guests/rsvp-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function PhoneLookupForm({ eventPublicToken }: { eventPublicToken: string }) {
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [step, setStep] = useState<'phone' | 'not_found' | 'found'>('phone');
  const [guest, setGuest] = useState<RsvpGuestPayload | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleLookup() {
    setFeedback(null);
    startTransition(async () => {
      const result = await lookupGuestByPhoneAction(eventPublicToken, phone);
      if (result.found) {
        setGuest(result.guest);
        setStep('found');
      } else if (result.notRegistered) {
        setStep('not_found');
      } else {
        setFeedback(result.message ?? 'Telefone inválido');
      }
    });
  }

  function handleRegister() {
    setFeedback(null);
    startTransition(async () => {
      const result = await registerGuestByPhoneAction(eventPublicToken, name, phone);
      if (result.success) {
        setGuest(result.guest);
        setStep('found');
      } else {
        setFeedback(result.message);
      }
    });
  }

  if (step === 'found' && guest) {
    return (
      <div className="space-y-6">
        <p className="text-center text-muted-foreground">Olá, {guest.name}!</p>
        <RsvpForm eventPublicToken={eventPublicToken} guest={guest} />
        <button
          className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
          onClick={() => {
            setStep('phone');
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
        {step === 'phone' && (
          <>
            <p className="text-sm text-muted-foreground">Digite o telefone que recebeu o convite para confirmar sua presença.</p>
            <Input
              type="tel"
              placeholder="(11) 99999-9999"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            {feedback && <p className="text-sm text-destructive">{feedback}</p>}
            <Button className="w-full" disabled={isPending || !phone.trim()} onClick={handleLookup}>
              {isPending ? 'Buscando...' : 'Continuar'}
            </Button>
          </>
        )}

        {step === 'not_found' && (
          <>
            <p className="text-sm text-muted-foreground">
              Não encontramos esse telefone na lista de convidados. Se você foi convidado(a), confirme seu nome abaixo.
            </p>
            <Input placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} />
            {feedback && <p className="text-sm text-destructive">{feedback}</p>}
            <Button className="w-full" disabled={isPending || !name.trim()} onClick={handleRegister}>
              {isPending ? 'Salvando...' : 'Confirmar presença'}
            </Button>
            <button
              className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
              onClick={() => setStep('phone')}
            >
              Trocar telefone
            </button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
