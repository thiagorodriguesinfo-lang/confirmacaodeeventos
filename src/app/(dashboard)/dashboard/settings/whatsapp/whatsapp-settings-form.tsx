'use client';

import { useState, useTransition } from 'react';
import type { WhatsappSettings } from '@prisma/client';
import { saveWhatsappSettingsAction } from '@/actions/whatsapp-settings.actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function WhatsappSettingsForm({ settings }: { settings: WhatsappSettings | null }) {
  const [provider, setProvider] = useState(settings?.provider ?? 'evolution_api');
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setFeedback(null);
    startTransition(async () => {
      const result = await saveWhatsappSettingsAction(formData);
      setFeedback(result.message);
    });
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      <div className="max-w-xs space-y-1">
        <Label>Provedor</Label>
        <select
          name="provider"
          value={provider}
          onChange={(e) => setProvider(e.target.value as typeof provider)}
          className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="baileys">WhatsApp embutido / grátis (via QR Code) — recomendado</option>
          <option value="evolution_api">Evolution API (self-hosted, via QR Code)</option>
          <option value="meta_cloud_api">WhatsApp Cloud API (Meta)</option>
          <option value="twilio">Twilio (WhatsApp API oficial)</option>
        </select>
      </div>

      {provider === 'baileys' && (
        <p className="text-sm text-muted-foreground">
          Não precisa de credenciais. Salve para habilitar o painel de conexão por QR Code abaixo. O número conecta direto no
          sistema, sem serviço externo.
        </p>
      )}

      {provider === 'evolution_api' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>URL da Evolution API</Label>
            <Input name="evolutionApiUrl" placeholder="https://evolution.seudominio.com" defaultValue={settings?.evolutionApiUrl ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>API Key</Label>
            <Input name="evolutionApiKey" type="password" defaultValue={settings?.evolutionApiKey ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>Nome da instância</Label>
            <Input name="evolutionInstanceName" placeholder="confirmacao-eventos" defaultValue={settings?.evolutionInstanceName ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>Webhook secret (opcional)</Label>
            <Input name="evolutionWebhookSecret" type="password" defaultValue={settings?.evolutionWebhookSecret ?? ''} />
          </div>
        </div>
      )}

      {provider === 'meta_cloud_api' && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Token de acesso</Label>
            <Input name="metaToken" type="password" defaultValue={settings?.metaToken ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>Phone Number ID</Label>
            <Input name="metaPhoneNumberId" defaultValue={settings?.metaPhoneNumberId ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>Business Account ID (opcional)</Label>
            <Input name="metaBusinessAccountId" defaultValue={settings?.metaBusinessAccountId ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>Token de verificação do webhook</Label>
            <Input name="metaWebhookVerifyToken" defaultValue={settings?.metaWebhookVerifyToken ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>App secret (opcional)</Label>
            <Input name="metaAppSecret" type="password" defaultValue={settings?.metaAppSecret ?? ''} />
          </div>
          <div className="space-y-1">
            <Label>Versão da Graph API</Label>
            <Input name="metaGraphApiVersion" placeholder="v21.0" defaultValue={settings?.metaGraphApiVersion ?? 'v21.0'} />
          </div>
        </div>
      )}

      {provider === 'twilio' && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Account SID</Label>
              <Input name="twilioAccountSid" placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" defaultValue={settings?.twilioAccountSid ?? ''} />
            </div>
            <div className="space-y-1">
              <Label>Auth Token</Label>
              <Input name="twilioAuthToken" type="password" defaultValue={settings?.twilioAuthToken ?? ''} />
            </div>
            <div className="space-y-1">
              <Label>Número de WhatsApp</Label>
              <Input
                name="twilioWhatsappNumber"
                placeholder="+14155238886 (sandbox) ou o número aprovado"
                defaultValue={settings?.twilioWhatsappNumber ?? ''}
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            No Console da Twilio, configure o webhook &quot;When a message comes in&quot; (Sandbox) ou do seu WhatsApp Sender
            (produção) para <code className="rounded bg-muted px-1 py-0.5">{`${process.env.NEXT_PUBLIC_APP_URL ?? ''}/api/webhooks/twilio`}</code>.
            No modo Sandbox, cada convidado precisa enviar o código &quot;join ...&quot; para o número da Twilio antes de
            poder receber mensagens.
          </p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Salvando...' : 'Salvar configurações'}
        </Button>
        {feedback && <p className="text-sm text-muted-foreground">{feedback}</p>}
      </div>
    </form>
  );
}
