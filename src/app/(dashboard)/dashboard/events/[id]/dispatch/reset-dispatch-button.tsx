'use client';

import { useState, useTransition } from 'react';
import { RotateCcw } from 'lucide-react';
import { resetDispatchStatusAction } from '@/actions/dispatch.actions';
import { Button } from '@/components/ui/button';

export function ResetDispatchButton({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleReset() {
    const confirmed = confirm(
      'Voltar todos os convidados "Enviado"/"Sem resposta" para "Pendente"?\n\n' +
        'Quem já confirmou ou recusou presença NÃO será afetado. Depois disso, um novo disparo em massa (filtro "Pendentes") vai enviar para todo mundo de novo, como se fosse a primeira vez.',
    );
    if (!confirmed) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await resetDispatchStatusAction(eventId);
      setFeedback(result.message);
    });
  }

  return (
    <div className="space-y-1 border-t pt-4">
      <Button type="button" variant="outline" size="sm" disabled={isPending} onClick={handleReset}>
        <RotateCcw className="h-4 w-4" />
        {isPending ? 'Reiniciando...' : 'Reiniciar disparo (voltar enviados para pendente)'}
      </Button>
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
