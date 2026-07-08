import { notFound } from 'next/navigation';
import { container } from '@/infrastructure/container';
import { listDispatchJobsAction } from '@/actions/dispatch.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreateDispatchForm } from './create-dispatch-form';
import { DispatchJobCard } from './dispatch-job-card';
import { ResetDispatchButton } from './reset-dispatch-button';

export default async function DispatchPage({ params }: { params: { id: string } }) {
  const event = await container.eventRepository.findById(params.id);
  if (!event) notFound();

  const jobs = await listDispatchJobsAction(params.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Disparo de convites</h1>
        <p className="text-sm text-muted-foreground">
          Envie o convite para os convidados respeitando um limite de mensagens por minuto.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo disparo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <CreateDispatchForm eventId={params.id} />
          <ResetDispatchButton eventId={params.id} />
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-lg font-semibold">Histórico de disparos</h2>
        {jobs.length === 0 && <p className="text-sm text-muted-foreground">Nenhum disparo criado ainda.</p>}
        {jobs.map((job) => (
          <DispatchJobCard key={job.id} job={job} eventId={params.id} />
        ))}
      </div>
    </div>
  );
}
