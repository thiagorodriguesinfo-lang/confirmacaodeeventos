'use client';

import { useTransition } from 'react';
import { Trash2 } from 'lucide-react';
import { deleteGuestAction } from '@/actions/guest.actions';
import { Button } from '@/components/ui/button';
import { ManualConfirmDialog } from './manual-confirm-dialog';

export function GuestRowActions({
  guestId,
  eventId,
  guestName,
  status,
  companions,
}: {
  guestId: string;
  eventId: string;
  guestName: string;
  status: string;
  companions: { name: string; age: number | null }[];
}) {
  const [isPending, startTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Remover este convidado?')) return;
    startTransition(() => deleteGuestAction(guestId, eventId));
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ManualConfirmDialog guestId={guestId} eventId={eventId} guestName={guestName} initialStatus={status} initialCompanions={companions} />
      <Button variant="ghost" size="icon" disabled={isPending} onClick={handleDelete} aria-label="Remover convidado">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
