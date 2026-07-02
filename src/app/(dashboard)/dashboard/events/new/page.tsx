import { NewEventForm } from './new-event-form';

export default function NewEventPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Novo evento</h1>
        <p className="text-sm text-muted-foreground">Preencha os dados do evento e personalize as mensagens automáticas</p>
      </div>
      <NewEventForm />
    </div>
  );
}
