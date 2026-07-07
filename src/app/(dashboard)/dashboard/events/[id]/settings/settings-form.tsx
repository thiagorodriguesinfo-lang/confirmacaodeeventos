'use client';

import { useState, useTransition } from 'react';
import type { Event } from '@prisma/client';
import { updateEventSettingsAction } from '@/actions/event.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { InvitationImageUpload } from '@/components/events/invitation-image-upload';

export function SettingsForm({ event }: { event: Event }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateEventSettingsAction(event.id, formData);
      setFeedback(result?.message ?? null);
    });
  }

  const dateValue = new Date(event.date).toISOString().slice(0, 10);

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome do evento</Label>
            <Input id="name" name="name" defaultValue={event.name} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" defaultValue={dateValue} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input id="time" name="time" type="time" defaultValue={event.time} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Input id="location" name="location" defaultValue={event.location} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxGuests">Máximo de convidados</Label>
            <Input id="maxGuests" name="maxGuests" type="number" min={1} defaultValue={event.maxGuests ?? ''} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" defaultValue={event.address ?? ''} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="googleMapsUrl">Link do Google Maps</Label>
            <Input id="googleMapsUrl" name="googleMapsUrl" defaultValue={event.googleMapsUrl ?? ''} />
          </div>
          <InvitationImageUpload defaultUrl={event.invitationImage} />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={event.description ?? ''} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens automáticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultMessage">Mensagem de convite</Label>
            <Textarea id="defaultMessage" name="defaultMessage" rows={6} defaultValue={event.defaultMessage} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thankYouMessage">Mensagem de agradecimento</Label>
            <Textarea id="thankYouMessage" name="thankYouMessage" rows={3} defaultValue={event.thankYouMessage} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="declinedMessage">Mensagem para quem recusou</Label>
            <Textarea id="declinedMessage" name="declinedMessage" rows={3} defaultValue={event.declinedMessage} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminderMessage">Mensagem de lembrete</Label>
            <Textarea id="reminderMessage" name="reminderMessage" rows={3} defaultValue={event.reminderMessage} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar alterações'}
        </Button>
      </div>
    </form>
  );
}
