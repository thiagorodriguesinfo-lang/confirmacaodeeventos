'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Pencil, X } from 'lucide-react';
import { updateGuestAction } from '@/actions/guest.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function EditGuestDialog({
  guestId,
  eventId,
  initialName,
  initialPhone,
}: {
  guestId: string;
  eventId: string;
  initialName: string;
  initialPhone: string;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setName(initialName);
      setPhone(initialPhone);
      setFeedback(null);
    }
  }

  function handleSubmit() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateGuestAction(guestId, eventId, { name, phone });
      if (result.success) {
        setOpen(false);
      } else {
        setFeedback(result.message);
      }
    });
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar convidado">
          <Pencil className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Editar convidado</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-guest-name">Nome</Label>
              <Input id="edit-guest-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-guest-phone">Telefone</Label>
              <Input id="edit-guest-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>

            {feedback && <p className="text-sm text-destructive">{feedback}</p>}

            <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-full">
              {isPending ? 'Salvando...' : 'Salvar alterações'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
