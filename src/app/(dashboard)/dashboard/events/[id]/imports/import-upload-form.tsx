'use client';

import { useState, useTransition } from 'react';
import { importCsvAction } from '@/actions/import.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export function ImportUploadForm({ eventId }: { eventId: string }) {
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await importCsvAction(eventId, formData);
      setFeedback(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Importar convidados</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="file">Arquivo CSV ou Excel</Label>
            <input
              id="file"
              name="file"
              type="file"
              accept=".csv,.xlsx,.xls"
              className="block w-full text-sm file:mr-4 file:rounded-md file:border-0 file:bg-secondary file:px-3 file:py-2 file:text-sm file:font-medium"
            />
            <p className="text-xs text-muted-foreground">Colunas esperadas: nome, telefone</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pasteText">Ou cole uma lista (um contato por linha)</Label>
            <Textarea id="pasteText" name="pasteText" rows={4} placeholder={'João - 21999999999\nMaria - 21988888888'} />
          </div>

          <Button type="submit" disabled={isPending}>
            {isPending ? 'Importando...' : 'Importar para revisão'}
          </Button>

          {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
        </form>
      </CardContent>
    </Card>
  );
}
