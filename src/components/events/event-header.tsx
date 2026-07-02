'use client';

import { useTransition } from 'react';
import type { Event } from '@prisma/client';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
import { updateEventStatusAction } from '@/actions/event.actions';

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho',
  ACTIVE: 'Ativo',
  PAUSED: 'Pausado',
  FINISHED: 'Encerrado',
  CANCELLED: 'Cancelado',
};

export function EventHeader({ event }: { event: Event }) {
  const [isPending, startTransition] = useTransition();

  function setStatus(status: 'ACTIVE' | 'PAUSED' | 'FINISHED') {
    startTransition(() => updateEventStatusAction(event.id, status));
  }

  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{event.name}</h1>
          <Badge variant={event.status === 'ACTIVE' ? 'success' : 'secondary'}>{STATUS_LABEL[event.status]}</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {formatDate(event.date)} às {event.time} — {event.location}
        </p>
      </div>
      <div className="flex gap-2">
        {event.status !== 'ACTIVE' && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus('ACTIVE')}>
            Ativar
          </Button>
        )}
        {event.status === 'ACTIVE' && (
          <Button size="sm" variant="outline" disabled={isPending} onClick={() => setStatus('PAUSED')}>
            Pausar
          </Button>
        )}
        <Button size="sm" variant="ghost" disabled={isPending} onClick={() => setStatus('FINISHED')}>
          Encerrar
        </Button>
      </div>
    </div>
  );
}
