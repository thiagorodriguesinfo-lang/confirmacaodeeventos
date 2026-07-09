'use client';

import { useState, useTransition } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { CheckCircle2, Plus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CompanionInput {
  name: string;
  age: string;
}

export interface ConfirmationSubmitInput {
  confirmed: boolean;
  notifyWhatsapp: boolean;
  companions?: { name: string; age?: number }[];
}

/**
 * Diálogo de confirmação/recusa com cadastro de acompanhantes (nome + idade),
 * reutilizado tanto pelo painel administrativo (`manual-confirm-dialog.tsx`,
 * que confirma via sessão logada) quanto pela página da equipe sem login
 * (`staff-confirm-dialog.tsx`, que confirma via staffToken). A diferença
 * entre os dois fica inteiramente em qual server action `onSubmit` chama.
 */
export function ConfirmationDialog({
  guestName,
  initialStatus,
  initialCompanions,
  triggerLabel,
  showCompanions = true,
  onSubmit,
}: {
  guestName: string;
  initialStatus: string;
  initialCompanions: { name: string; age: number | null }[];
  /** Rótulo do botão que abre o diálogo. Se omitido, usa apenas o ícone de check. */
  triggerLabel?: string;
  /** false = não mostra nem envia acompanhantes (ex: página da equipe, que agora gerencia isso na aba de Convidados). */
  showCompanions?: boolean;
  onSubmit: (input: ConfirmationSubmitInput) => Promise<{ success: boolean; message: string }>;
}) {
  const [open, setOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(initialStatus !== 'DECLINED');
  const [companions, setCompanions] = useState<CompanionInput[]>(
    initialCompanions.map((c) => ({ name: c.name, age: c.age?.toString() ?? '' })),
  );
  const [notifyWhatsapp, setNotifyWhatsapp] = useState(true);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

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
      const result = await onSubmit({
        confirmed,
        notifyWhatsapp,
        ...(showCompanions
          ? {
              companions: confirmed
                ? companions
                    .filter((c) => c.name.trim())
                    .map((c) => ({ name: c.name.trim(), age: c.age ? Number(c.age) : undefined }))
                : [],
            }
          : {}),
      });

      if (result.success) {
        setOpen(false);
      } else {
        setFeedback(result.message);
      }
    });
  }

  const companionCount = companions.filter((c) => c.name.trim()).length;

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        {triggerLabel ? (
          <Button size="sm">
            <CheckCircle2 className="h-4 w-4" />
            {triggerLabel}
          </Button>
        ) : (
          <Button variant="ghost" size="icon" aria-label="Confirmar manualmente">
            <CheckCircle2 className="h-4 w-4" />
          </Button>
        )}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/50" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 max-h-[85vh] w-[92vw] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-lg border bg-card p-6 shadow-lg">
          <div className="mb-4 flex items-center justify-between">
            <Dialog.Title className="text-lg font-semibold">Confirmação — {guestName}</Dialog.Title>
            <Dialog.Close asChild>
              <Button variant="ghost" size="icon" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </Dialog.Close>
          </div>

          <div className="space-y-4">
            <div className="flex gap-2">
              <Button type="button" variant={confirmed ? 'default' : 'outline'} size="sm" onClick={() => setConfirmed(true)}>
                Confirmado
              </Button>
              <Button type="button" variant={!confirmed ? 'default' : 'outline'} size="sm" onClick={() => setConfirmed(false)}>
                Recusado
              </Button>
            </div>

            {showCompanions && confirmed && (
              <div className="space-y-2">
                <Label>Acompanhantes</Label>
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
                <p className="text-xs text-muted-foreground">
                  Total confirmado: {1 + companionCount} pessoa(s), incluindo {guestName}.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2 text-sm text-muted-foreground">
              <input
                type="checkbox"
                checked={notifyWhatsapp}
                onChange={(e) => setNotifyWhatsapp(e.target.checked)}
                className="h-4 w-4"
              />
              Enviar mensagem de {confirmed ? 'agradecimento' : 'recusa'} pelo WhatsApp
            </label>

            {feedback && <p className="text-sm text-destructive">{feedback}</p>}

            <Button type="button" onClick={handleSubmit} disabled={isPending} className="w-full">
              {isPending ? 'Salvando...' : 'Salvar confirmação'}
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
