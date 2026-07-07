'use client';

import { useState, useTransition } from 'react';
import { createEventAction } from '@/actions/event.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { InvitationImageUpload } from '@/components/events/invitation-image-upload';
import {
  DEFAULT_DECLINED_MESSAGE,
  DEFAULT_INVITE_MESSAGE,
  DEFAULT_REMINDER_MESSAGE,
  DEFAULT_THANK_YOU_MESSAGE,
} from '@/core/services/message-template.service';

export function NewEventForm() {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createEventAction(formData);
      // createEventAction redireciona em caso de sucesso (lança NEXT_REDIRECT);
      // só chegamos aqui quando ha erro de validacao.
      if (result && !result.success) setFeedback(result.message);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Nome do evento</Label>
            <Input id="name" name="name" placeholder="Aniversário da Sofia" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="date">Data</Label>
            <Input id="date" name="date" type="date" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="time">Horário</Label>
            <Input id="time" name="time" type="time" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="location">Local</Label>
            <Input id="location" name="location" placeholder="Espaço Villa Jardim" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxGuests">Máximo de convidados</Label>
            <Input id="maxGuests" name="maxGuests" type="number" min={1} placeholder="Opcional" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Endereço</Label>
            <Input id="address" name="address" placeholder="Rua Exemplo, 123 — Rio de Janeiro/RJ" />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="googleMapsUrl">Link do Google Maps</Label>
            <Input id="googleMapsUrl" name="googleMapsUrl" placeholder="https://maps.google.com/..." />
          </div>
          <InvitationImageUpload />
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" name="description" rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mensagens automáticas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="defaultMessage">
              Mensagem de convite (variáveis: {'{{nome}} {{evento}} {{data}} {{hora}} {{local}} {{maps}} {{link}}'})
            </Label>
            <Textarea id="defaultMessage" name="defaultMessage" rows={6} defaultValue={DEFAULT_INVITE_MESSAGE} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="thankYouMessage">Mensagem de agradecimento (confirmado)</Label>
            <Textarea id="thankYouMessage" name="thankYouMessage" rows={3} defaultValue={DEFAULT_THANK_YOU_MESSAGE} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="declinedMessage">Mensagem para quem recusou</Label>
            <Textarea id="declinedMessage" name="declinedMessage" rows={3} defaultValue={DEFAULT_DECLINED_MESSAGE} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reminderMessage">Mensagem de lembrete</Label>
            <Textarea id="reminderMessage" name="reminderMessage" rows={3} defaultValue={DEFAULT_REMINDER_MESSAGE} />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Criando...' : 'Criar evento'}
        </Button>
      </div>
    </form>
  );
}
