import { getWhatsappSettingsAction } from '@/actions/whatsapp-settings.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { WhatsappSettingsForm } from './whatsapp-settings-form';
import { EvolutionConnectPanel } from './evolution-connect-panel';

export default async function WhatsappSettingsPage() {
  const settings = await getWhatsappSettingsAction();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações do WhatsApp</h1>
        <p className="text-sm text-muted-foreground">
          Escolha o provedor e informe as credenciais usadas para enviar e receber mensagens (incluindo os contatos
          encaminhados para importação).
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Provedor e credenciais</CardTitle>
        </CardHeader>
        <CardContent>
          <WhatsappSettingsForm settings={settings} />
        </CardContent>
      </Card>

      {settings?.provider === 'evolution_api' && (
        <Card>
          <CardHeader>
            <CardTitle>Conectar número (QR Code)</CardTitle>
          </CardHeader>
          <CardContent>
            <EvolutionConnectPanel
              hasCredentials={Boolean(settings.evolutionApiUrl && settings.evolutionApiKey && settings.evolutionInstanceName)}
              connectionStatus={settings.connectionStatus}
              lastConnectionCheck={settings.lastConnectionCheck}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
