import { notFound } from 'next/navigation';
import { container } from '@/infrastructure/container';
import { SettingsForm } from './settings-form';

export default async function EventSettingsPage({ params }: { params: { id: string } }) {
  const event = await container.eventRepository.findById(params.id);
  if (!event) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações do evento</h1>
        <p className="text-sm text-muted-foreground">Atualize dados e mensagens automáticas</p>
      </div>
      <SettingsForm event={event} />
    </div>
  );
}
