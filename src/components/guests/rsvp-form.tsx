'use client';

import { useState, useTransition } from 'react';
import { Trash2, CheckCircle2, XCircle } from 'lucide-react';
import { submitPublicRsvpAction } from '@/actions/public-rsvp.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';

interface CompanionInput {
  name: string;
  age: string;
}

export function RsvpForm({
  eventPublicToken,
  guest,
}: {
  eventPublicToken: string;
  guest: { id: string; status: string; confirmedCount: number; companions: { name: string; age: number | null }[] };
}) {
  const [isPending, startTransition] = useTransition();
  const [decision, setDecision] = useState<'CONFIRM' | 'DECLINE' | null>(
    guest.status === 'CONFIRMED' ? 'CONFIRM' : guest.status === 'DECLINED' ? 'DECLINE' : null,
  );
  const [companions, setCompanions] = useState<CompanionInput[]>(
    guest.companions.map((c) => ({ name: c.name, age: c.age?.toString() ?? '' })),
  );
  const [result, setResult] = useState<string | null>(null);

  function removeCompanion(index: number) {
    setCompanions((prev) => prev.filter((_, i) => i !== index));
  }

  function updateCompanion(index: number, field: keyof CompanionInput, value: string) {
    setCompanions((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)));
  }

  function submit(confirmed: boolean) {
    startTransition(async () => {
      const response = await submitPublicRsvpAction({
        eventPublicToken,
        guestId: guest.id,
        confirmed,
        companions: confirmed
          ? companions.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), age: c.age ? Number(c.age) : undefined }))
          : [],
      });

      if (response.success) {
        setDecision(confirmed ? 'CONFIRM' : 'DECLINE');
        setResult(confirmed ? 'Presença confirmada! Obrigado 🎉' : 'Resposta registrada. Sentiremos sua falta!');
      } else {
        setResult(response.message ?? 'Erro ao registrar resposta');
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        {decision === null && (
          <div className="flex gap-3">
            <Button className="flex-1" disabled={isPending} onClick={() => submit(true)}>
              <CheckCircle2 className="h-4 w-4" /> Vou comparecer
            </Button>
            <Button variant="outline" className="flex-1" disabled={isPending} onClick={() => submit(false)}>
              <XCircle className="h-4 w-4" /> Não poderei ir
            </Button>
          </div>
        )}

        {decision === 'CONFIRM' && (
          <div className="space-y-4">
            <p className="text-sm font-medium text-success">Presença confirmada!</p>
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Acompanhantes (opcional)</p>
              {companions.map((c, i) => (
                <div key={i} className="flex gap-2">
                  <Input placeholder="Nome" value={c.name} onChange={(e) => updateCompanion(i, 'name', e.target.value)} />
                  <Input
                    placeholder="Idade"
                    type="number"
                    min={0}
                    className="w-24"
                    value={c.age}
                    onChange={(e) => updateCompanion(i, 'age', e.target.value)}
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeCompanion(i)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
            <Button className="w-full" disabled={isPending} onClick={() => submit(true)}>
              {isPending ? 'Salvando...' : 'Salvar confirmação'}
            </Button>
          </div>
        )}

        {decision === 'DECLINE' && <p className="text-sm font-medium text-destructive">Resposta registrada: não poderá comparecer.</p>}

        {result && <p className="text-center text-sm text-muted-foreground">{result}</p>}

        {decision !== null && (
          <button
            className="w-full text-center text-xs text-muted-foreground underline underline-offset-4"
            onClick={() => setDecision(null)}
          >
            Alterar resposta
          </button>
        )}
      </CardContent>
    </Card>
  );
}
