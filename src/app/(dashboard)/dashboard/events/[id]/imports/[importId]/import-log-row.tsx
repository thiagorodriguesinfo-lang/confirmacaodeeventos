'use client';

import { useState, useTransition } from 'react';
import type { ImportLog } from '@prisma/client';
import { Check, X, Pencil } from 'lucide-react';
import { approveImportAction } from '@/actions/import.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function ImportLogRow({ log, importId, eventId }: { log: ImportLog; importId: string; eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(log.rawName ?? '');
  const [phone, setPhone] = useState(log.normalizedPhone ?? log.rawPhone ?? '');

  function approve() {
    startTransition(() =>
      approveImportAction(importId, eventId, [
        { logId: log.id, decision: 'APPROVE', correctedName: name, correctedPhone: phone },
      ]),
    );
  }

  function reject() {
    startTransition(() => approveImportAction(importId, eventId, [{ logId: log.id, decision: 'REJECT' }]));
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border px-3 py-2">
      {editing ? (
        <div className="flex flex-1 gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome" className="max-w-[200px]" />
          <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Telefone" className="max-w-[180px]" />
        </div>
      ) : (
        <div className="text-sm">
          <span className="font-medium">{name || '(sem nome)'}</span>
          <span className="ml-2 text-muted-foreground">{phone || '(sem telefone)'}</span>
          {log.errorReason && <p className="text-xs text-destructive">{log.errorReason}</p>}
        </div>
      )}

      <div className="flex gap-1">
        <Button variant="ghost" size="icon" onClick={() => setEditing((v) => !v)} aria-label="Editar">
          <Pencil className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" disabled={isPending} onClick={approve} aria-label="Aprovar">
          <Check className="h-4 w-4 text-success" />
        </Button>
        <Button variant="ghost" size="icon" disabled={isPending} onClick={reject} aria-label="Rejeitar">
          <X className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );
}
