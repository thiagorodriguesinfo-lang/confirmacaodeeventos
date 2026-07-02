'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteGuestAction } from '@/actions/guest.actions';
import { Button } from '@/components/ui/button';

export function GuestRowActions({ guestId, eventId }: { guestId: string; eventId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Remover este convidado?')) return;
    startTransition(() => deleteGuestAction(guestId, eventId));
  }

  return (
    <Button variant="ghost" size="icon" disabled={isPending} onClick={handleDelete} aria-label="Remover convidado">
      <Trash2 className="h-4 w-4 text-destructive" />
    </Button>
  );
}
