'use client';

import { useState, useTransition } from 'react';
import { createDispatchJobAction } from '@/actions/dispatch.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

// Valores baixos de proposito: envios automatizados via WhatsApp em ritmo
// muito rapido/regular sao um dos principais motivos de o numero ser
// desconectado ou banido. 8/min e o padrao recomendado; acima de 20/min o
// risco aumenta bastante, principalmente em numeros novos ou no WhatsApp
// embutido (Baileys).
const RATE_PRESETS = [8, 15, 20];

const STATUS_OPTIONS = [
  { value: 'PENDING', label: 'Pendentes' },
  { value: 'NO_RESPONSE', label: 'Sem resposta' },
  { value: 'SENT', label: 'Já enviados (reenviar)' },
];

export function CreateDispatchForm({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const [rate, setRate] = useState(8);

  function handleSubmit(formData: FormData) {
    formData.set('eventId', eventId);
    formData.set('ratePerMinute', String(rate));
    startTransition(async () => {
      const result = await createDispatchJobAction(formData);
      setFeedback(result.message);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label>Enviar para</Label>
        <div className="flex flex-wrap gap-4">
          {STATUS_OPTIONS.map((opt) => (
            <label key={opt.value} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="guestStatusFilter" value={opt.value} defaultChecked={opt.value === 'PENDING'} />
              {opt.label}
            </label>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">Se nenhum for marcado, envia para todos os convidados do evento.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="ratePerMinute">Mensagens por minuto</Label>
        <div className="flex items-center gap-2">
          {RATE_PRESETS.map((preset) => (
            <Button key={preset} type="button" variant={rate === preset ? 'default' : 'outline'} size="sm" onClick={() => setRate(preset)}>
              {preset}/min
            </Button>
          ))}
          <Input
            type="number"
            min={1}
            max={1000}
            value={rate}
            onChange={(e) => setRate(Number(e.target.value))}
            className="w-24"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          O sistema já varia o intervalo entre envios e faz pausas automáticas a cada ~40 mensagens para reduzir o
          risco de o número ser desconectado. Ainda assim, evite ultrapassar 20/min — quanto mais rápido, maior a
          chance de o WhatsApp bloquear o número por comportamento de disparo em massa.
        </p>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? 'Criando...' : 'Iniciar disparo'}
      </Button>

      {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
    </form>
  );
}
