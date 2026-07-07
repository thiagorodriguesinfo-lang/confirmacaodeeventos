'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import Image from 'next/image';
import {
  connectBaileysAction,
  checkBaileysConnectionAction,
  disconnectBaileysAction,
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

export function BaileysConnectPanel({
  connectionStatus,
  qr,
  lastConnectionCheck,
}: {
  connectionStatus: string | null;
  qr: string | null;
  lastConnectionCheck: Date | null;
}) {
  const [status, setStatus] = useState(connectionStatus ?? 'disconnected');
  const [qrCode, setQrCode] = useState<string | null>(qr);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Se ja estiver aguardando leitura ao abrir a pagina, retoma o polling.
    if ((connectionStatus ?? 'disconnected') === 'connecting') startPolling();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        const result = await checkBaileysConnectionAction();
        if (result.success) {
          setStatus(result.status);
          setQrCode(result.qr);
          if (result.status === 'connected') {
            setQrCode(null);
            stopPolling();
          }
        }
      });
    }, 3000);
  }

  function handleConnect() {
    setError(null);
    startTransition(async () => {
      const result = await connectBaileysAction();
      if (!result.success) {
        setError(result.message);
        return;
      }
      setStatus('connecting');
      setQrCode(result.qr);
      startPolling();
    });
  }

  function handleDisconnect() {
    setError(null);
    startTransition(async () => {
      const result = await disconnectBaileysAction();
      if (!result.success) {
        setError(result.message);
        return;
      }
      stopPolling();
      setStatus('disconnected');
      setQrCode(null);
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        WhatsApp embutido (grátis, via QR Code). O número fica conectado direto no sistema — não precisa de nenhum serviço
        externo. O QR é gerado pelo processo de disparo (worker); se demorar a aparecer, aguarde alguns segundos.
      </p>

      <div className="flex items-center gap-3">
        <span className="text-sm text-muted-foreground">Status:</span>
        <Badge variant={STATUS_VARIANT[status] ?? 'secondary'}>{STATUS_LABEL[status] ?? status}</Badge>
        {lastConnectionCheck && (
          <span className="text-xs text-muted-foreground">
            última atualização: {new Date(lastConnectionCheck).toLocaleString('pt-BR')}
          </span>
        )}
      </div>

      {qrCode && status !== 'connected' && (
        <div className="flex flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            Abra o WhatsApp no celular que vai enviar as mensagens → Aparelhos conectados → Conectar um aparelho, e escaneie o
            código abaixo.
          </p>
          <Image src={qrCode} alt="QR Code de pareamento do WhatsApp" width={256} height={256} unoptimized className="rounded-md border" />
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleConnect} disabled={isPending || status === 'connected'}>
          {isPending && !qrCode ? 'Solicitando...' : status === 'connected' ? 'Conectado' : 'Conectar WhatsApp'}
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
