'use client';

import { useTransition } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { deleteGuestAction, sendInvitationToGuestAction } from '@/actions/guest.actions';
import { Button } from '@/components/ui/button';
import { ManualConfirmDialog } from './manual-confirm-dialog';
import { EditGuestDialog } from './edit-guest-dialog';

export function GuestRowActions({
  guestId,
  eventId,
  guestName,
  guestPhone,
  status,
  companions,
}: {
  guestId: string;
  eventId: string;
  guestName: string;
  guestPhone: string;
  status: string;
  companions: { name: string; age: number | null }[];
}) {
  const [isPending, startTransition] = useTransition();
  const [isSending, startSendTransition] = useTransition();

  function handleDelete() {
    if (!confirm('Remover este convidado?')) return;
    startTransition(() => deleteGuestAction(guestId, eventId));
  }

  function handleSendInvitation() {
    if (!confirm(`Enviar o convite para ${guestName} agora?`)) return;
    startSendTransition(async () => {
      const result = await sendInvitationToGuestAction(guestId, eventId);
      alert(result.message);
    });
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <ManualConfirmDialog guestId={guestId} eventId={eventId} guestName={guestName} initialStatus={status} initialCompanions={companions} />
      <EditGuestDialog guestId={guestId} eventId={eventId} initialName={guestName} initialPhone={guestPhone} />
      <Button variant="ghost" size="icon" disabled={isSending} onClick={handleSendInvitation} aria-label="Enviar convite">
        <Send className="h-4 w-4" />
      </Button>
      <Button variant="ghost" size="icon" disabled={isPending} onClick={handleDelete} aria-label="Remover convidado">
        <Trash2 className="h-4 w-4 text-destructive" />
      </Button>
    </div>
  );
}
