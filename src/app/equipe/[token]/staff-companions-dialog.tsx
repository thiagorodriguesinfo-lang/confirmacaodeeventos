'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Trash2, Users, X } from 'lucide-react';
import { updateGuestCompanionsViaStaffTokenAction } from '@/actions/staff.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface CompanionInput {
  name: string;
  age: string;
}

export function StaffCompanionsDialog({
  staffToken,
  guestId,
  guestName,
  initialCompanions,
}: {
  staffToken: string;
  guestId: string;
  guestName: string;
  initialCompanions: { name: string; age: number | null }[];
}) {
  const [open, setOpen] = useState(false);
  const [companions, setCompanions] = useState<CompanionInput[]>(toCompanionInputs(initialCompanions));
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) {
      setCompanions(toCompanionInputs(initialCompanions));
      setFeedback(null);
    }
  }

  function addCompanion() {
    setCompanions((prev) => [...prev, { name: '', age: '' }]);
  }

  function removeCompanion(index: number) {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCompanion(index: number, field: 'name' | 'age', value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function handleSubmit() {
    setFeedback(null);
    startTransition(async () => {
      const result = await updateGuestCompanionsViaStaffTokenAction(
        staffToken,
        guestId,
        companions.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), age: c.age ? Number(c.age) : undefined })),
      );
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
        <Button variant="ghost" size="icon" aria-label="Acompanhantes">
          <Users className="h-4 w-4" />
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-sm -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Acompanhantes — {guestName}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              {companions.map((c, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Input
                    placeholder="Nome"
                    value={c.name}
                    onChange={(e) => updateCompanion(i, 'name', e.target.value)}
                    className="flex-1"
                  />
                  <Input
                    placeholder="Idade"
                    type="number"
                    min={0}
                    value={c.age}
                    onChange={(e) => updateCompanion(i, 'age', e.target.value)}
                    className="w-20"
                  />
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeCompanion(i)} aria-label="Remover acompanhante">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addCompanion}>
                <Plus className="h-4 w-4" />
                Adicionar acompanhante
              </Button>
            </div>

            {feedback && <p className="text-sm text-destructive">{feedback}</p>}

            <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-full">
              {isPending ? 'Salvando...' : 'Salvar acompanhantes'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function toCompanionInputs(companions: { name: string; age: number | null }[]): CompanionInput[] {
  return companions.map((c) => ({ name: c.name, age: c.age?.toString() ?? '' }));
}
