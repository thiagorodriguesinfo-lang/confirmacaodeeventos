'use client';

import { useEffect, useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function GenericRsvpLinkCard({ publicToken }: { publicToken: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = origin ? `${origin}/presenca/${publicToken}` : '';

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link único de confirmação (lista de transmissão)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Um único link para todos os convidados — em vez de um link individual por pessoa, o próprio convidado digita o
          telefone que recebeu o convite para se identificar e confirmar presença. Útil para enviar por uma lista de
          transmissão do WhatsApp em vez de um disparo individual. Como não há senha/token por convidado, qualquer pessoa
          que souber o telefone de alguém consegue confirmar em nome dela.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={link} placeholder="Carregando..." className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!link}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
