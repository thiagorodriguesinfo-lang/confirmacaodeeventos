'use client';

import { useTransition } from 'react';
import type { DispatchJob } from '@prisma/client';
import { Pause, Play, X } from 'lucide-react';
import { controlDispatchJobAction } from '@/actions/dispatch.actions';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, { label: string; variant: 'success' | 'warning' | 'secondary' | 'destructive' }> = {
  QUEUED: { label: 'Na fila', variant: 'secondary' },
  RUNNING: { label: 'Enviando', variant: 'warning' },
  PAUSED: { label: 'Pausado', variant: 'secondary' },
  COMPLETED: { label: 'Concluído', variant: 'success' },
  CANCELLED: { label: 'Cancelado', variant: 'destructive' },
  FAILED: { label: 'Falhou', variant: 'destructive' },
};

export function DispatchJobCard({ job, eventId }: { job: DispatchJob; eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const status = STATUS_LABEL[job.status] ?? { label: job.status, variant: 'secondary' as const };
  const progress = job.totalTargets > 0 ? Math.round(((job.sentCount + job.failedCount) / job.totalTargets) * 100) : 0;

  function act(action: 'PAUSE' | 'RESUME' | 'CANCEL') {
    startTransition(() => controlDispatchJobAction(job.id, eventId, action));
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">
              {job.sentCount}/{job.totalTargets} enviados • {job.ratePerMinute}/min
            </p>
            <p className="text-xs text-muted-foreground">Criado em {new Date(job.createdAt).toLocaleString('pt-BR')}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={status.variant}>{status.label}</Badge>
            {(job.status === 'QUEUED' || job.status === 'RUNNING') && (
              <Button variant="outline" size="icon" disabled={isPending} onClick={() => act('PAUSE')} aria-label="Pausar">
                <Pause className="h-4 w-4" />
              </Button>
            )}
            {job.status === 'PAUSED' && (
              <Button variant="outline" size="icon" disabled={isPending} onClick={() => act('RESUME')} aria-label="Retomar">
                <Play className="h-4 w-4" />
              </Button>
            )}
            {['QUEUED', 'RUNNING', 'PAUSED'].includes(job.status) && (
              <Button variant="outline" size="icon" disabled={isPending} onClick={() => act('CANCEL')} aria-label="Cancelar">
                <X className="h-4 w-4 text-destructive" />
              </Button>
            )}
          </div>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
          <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
        </div>
        {job.failedCount > 0 && <p className="text-xs text-destructive">{job.failedCount} falharam</p>}
      </CardContent>
    </Card>
  );
}
