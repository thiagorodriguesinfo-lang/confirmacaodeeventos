'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  connectEvolutionAction,
  checkEvolutionConnectionAction,
  disconnectEvolutionAction,
} from '@/actions/whatsapp-settings.actions';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const STATUS_LABEL: Record<string, string> = {
  connected: 'Conectado',
  connecting: 'Aguardando leitura do QR Code',
  disconnected: 'Desconectado',
};

const STATUS_VARIANT: Record<string, 'success' | 'warning' | 'secondary'> = {
  connected: 'success',
  connecting: 'warning',
  disconnected: 'secondary',
};

export function EvolutionConnectPanel({
  hasCredentials,
  connectionStatus,
  lastConnectionCheck,
}: {
  hasCredentials: boolean;
  connectionStatus: string | null;
  lastConnectionCheck: Date | null;
}) {
  const [status, setStatus] = useState(connectionStatus ?? 'disconnected');
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling() {
    stopPolling();
    pollRef.current = setInterval(() => {
      startTransition(async () => {
        const result = await checkEvolutionConnectionAction();
        if (result.success) {
          setStatus(result.status);
          if (result.status === 'connected') {
            setQrCode(null);
            stopPolling();
          }
        }
      });
    }, 4000);
  }

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const result = await connectEvolutionAction();
      if (!result.success) {
        setError(result.message);
        return;
      }
      setStatus('connecting');
      setQrCode(result.qr.base64);
      startPolling();
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectEvolutionAction();
      if (!result.success) {
        setError(result.message);
        return;
      }
      stopPolling();
      setStatus('disconnected');
      setQrCode(null);
    });
  }

  if (!hasCredentials) {
    return <p className="text-sm text-muted-foreground">Salve a URL, a API Key e o nome da instância acima para poder conectar.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{STATUS_LABEL[status] ?? status}</Badge>
        {lastConnectionCheck && (
          <span className="text-xs text-muted-foreground">
            última verificação: {new Date(lastConnectionCheck).toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {qrCode && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            Abra o WhatsApp no celular que vai receber os contatos → Aparelhos conectados → Conectar um aparelho, e escaneie o
            código abaixo.
          </p>
          <Image src={qrCode} alt="QR Code de pareamento do WhatsApp" width={256} height={256} unoptimized className="rounded-md border" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleConnect} disabled={isPending || status === 'connected'}>
          {isPending && !qrCode ? 'Gerando QR Code...' : status === 'connected' ? 'Conectado' : 'Conectar WhatsApp'}
        </Button>
        {status !== 'disconnected' && (
          <Button type="button" variant="outline" onClick={handleDisconnect} disabled={isPending}>
            Desconectar
          </Button>
        )}
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>
    </div>
  );
}
