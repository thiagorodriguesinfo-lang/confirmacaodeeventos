'use client';

import { useRef, useState, useTransition } from 'react';
import { Plus } from 'lucide-react';
import { createManualGuestAction } from '@/actions/guest.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

export function AddGuestForm({ eventId }: { eventId: string }) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        Adicionar convidado manualmente
      </Button>
    );
  }

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createManualGuestAction(eventId, formData);
      setFeedback(result.message);
      if (result.success) formRef.current?.reset();
    });
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form ref={formRef} action={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Nome</label>
            <Input name="name" required />
          </div>
          <div className="min-w-[180px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">Telefone</label>
            <Input name="phone" placeholder="(21) 99999-9999" required />
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? 'Salvando...' : 'Salvar'}
          </Button>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
        </form>
        {feedback && <p className="mt-2 text-sm text-muted-foreground">{feedback}</p>}
      </CardContent>
    </Card>
  );
}
