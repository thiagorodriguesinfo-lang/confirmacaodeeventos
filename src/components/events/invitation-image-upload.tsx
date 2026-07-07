'use client';

import { useState, useTransition, type ChangeEvent } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';
import { uploadInvitationImageAction } from '@/actions/upload.actions';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

/**
 * Upload da imagem do convite, enviada junto com a mensagem no disparo em
 * lote (ver dispatch-worker.ts — ja usa `event.invitationImage` quando
 * presente). Guarda a URL final num input escondido `invitationImage`, para
 * que os formularios de criar/editar evento continuem funcionando sem
 * mudanca no restante do fluxo (Server Action + validacao Zod existentes).
 */
export function InvitationImageUpload({ defaultUrl }: { defaultUrl?: string | null }) {
  const [url, setUrl] = useState(defaultUrl ?? '');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo depois, se remover

    if (!file) return;
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    startTransition(async () => {
      const result = await uploadInvitationImageAction(formData);
      if (result.success) {
        setUrl(`${window.location.origin}${result.url}`);
      } else {
        setError(result.message);
      }
    });
  }

  return (
    <div className="space-y-2 sm:col-span-2">
      <Label>Imagem do convite</Label>
      <input type="hidden" name="invitationImage" value={url} />

      {url ? (
        <div className="relative w-fit">
          {/* eslint-disable-next-line @next/next/no-img-element -- URL absoluta com origem dinamica (IP/dominio pode variar por deploy) */}
          <img src={url} alt="Imagem do convite" className="h-40 w-auto rounded-md border object-cover" />
          <Button
            type="button"
            variant="destructive"
            size="icon"
            className="absolute -right-2 -top-2 h-6 w-6"
            onClick={() => setUrl('')}
            aria-label="Remover imagem"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      ) : (
        <label className="flex h-32 w-full max-w-xs cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:bg-accent">
          {isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          {isPending ? 'Enviando...' : 'Enviar imagem'}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
            disabled={isPending}
          />
        </label>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">JPG, PNG ou WebP, até 5MB. Enviada junto com a mensagem no disparo.</p>
    </div>
  );
}
