'use client';

import { useEffect, useState, useTransition } from 'react';
import { Copy, Check, RefreshCw } from 'lucide-react';
import { regenerateStaffTokenAction } from '@/actions/event.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export function StaffLinkCard({ eventId, staffToken }: { eventId: string; staffToken: string }) {
  const [origin, setOrigin] = useState('');
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const link = origin ? `${origin}/equipe/${staffToken}` : '';

  function handleCopy() {
    if (!link) return;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleRegenerate() {
    if (!confirm('Gerar um novo link vai invalidar o link atual — quem estiver usando o link antigo perde o acesso. Continuar?')) return;
    setFeedback(null);
    startTransition(async () => {
      const result = await regenerateStaffTokenAction(eventId);
      setFeedback(result.message);
    });
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Link da equipe</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Envie este link para quem vai ajudar a cadastrar convidados e confirmar presença pelo celular, sem precisar
          de login. Qualquer pessoa com o link consegue adicionar, confirmar ou recusar convidados deste evento.
        </p>
        <div className="flex gap-2">
          <Input readOnly value={link} placeholder="Carregando..." className="font-mono text-xs" />
          <Button type="button" variant="outline" onClick={handleCopy} disabled={!link}>
            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copiado' : 'Copiar'}
          </Button>
        </div>
        <Button type="button" variant="ghost" size="sm" onClick={handleRegenerate} disabled={isPending}>
          <RefreshCw className="h-4 w-4" />
          {isPending ? 'Gerando...' : 'Gerar novo link'}
        </Button>
        {feedback && <p className="text-xs text-muted-foreground">{feedback}</p>}
      </CardContent>
    </Card>
  );
}
