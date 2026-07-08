'use client';

import { useState, useTransition } from 'react';
import { clearSendQueueAction } from '@/actions/whatsapp-settings.actions';
import { Button } from '@/components/ui/button';

interface ActiveJob {
  id: string;
  status: string;
  totalTargets: number;
  sentCount: number;
  event: { name: string };
}

export function OutboxQueuePanel({
  outboxPending,
  outboxFailed,
  activeJobs,
}: {
  outboxPending: number;
  outboxFailed: number;
  activeJobs: ActiveJob[];
}) {
  const [state, setState] = useState({ outboxPending, outboxFailed, activeJobs });
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  const hasQueue = state.outboxPending > 0 || state.outboxFailed > 0 || state.activeJobs.length > 0;

  function handleClear() {
    const confirmed = confirm(
      `Isso vai apagar ${state.outboxPending + state.outboxFailed} mensagem(ns) da fila interna e cancelar ${
        state.activeJobs.length
      } disparo(s) em massa ainda em andamento. Nada disso será enviado. Continuar?`,
    );
    if (!confirmed) return;

    setFeedback(null);
    startTransition(async () => {
      const result = await clearSendQueueAction();
      setState({ outboxPending: 0, outboxFailed: 0, activeJobs: [] });
      setFeedback(`Fila zerada: ${result.outboxCount} mensagem(ns) removida(s), ${result.jobsCount} disparo(s) cancelado(s).`);
    });
  }

  return (
    <div className="space-y-2 border-t pt-4">
      <p className="text-sm text-muted-foreground">
        Fila interna de envio: <strong>{state.outboxPending}</strong> aguardando, <strong>{state.outboxFailed}</strong> com
        falha.
      </p>
      {state.activeJobs.length > 0 ? (
        <ul className="text-sm text-muted-foreground">
          {state.activeJobs.map((job) => (
            <li key={job.id}>
              Disparo em &ldquo;{job.event.name}&rdquo;: {job.sentCount}/{job.totalTargets} enviados ({job.status.toLowerCase()})
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">Nenhum disparo em massa ativo no momento.</p>
      )}
      {hasQueue && (
        <Button type="button" variant="destructive" size="sm" disabled={isPending} onClick={handleClear}>
          {isPending ? 'Zerando...' : 'Zerar fila'}
        </Button>
      )}
      {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
    </div>
  );
}
