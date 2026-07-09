import { prisma } from '@/infrastructure/database/prisma';
import { BaileysProvider } from './baileys.provider';
import { EvolutionApiProvider } from './evolution-api.provider';
import { MetaCloudApiProvider } from './meta-cloud-api.provider';
import { TwilioWhatsappProvider } from './twilio-whatsapp.provider';
import type { WhatsappProvider } from './whatsapp-provider.interface';

export type WhatsappProviderName = 'meta_cloud_api' | 'evolution_api' | 'baileys' | 'twilio';

let testOverride: WhatsappProvider | null = null;

/**
 * Fabrica responsavel por instanciar o WhatsappProvider ativo.
 *
 * Prioridade de configuracao:
 *   1. Linha singleton em `whatsapp_settings` (configurada via painel em
 *      /dashboard/settings/whatsapp) — permite trocar de provedor e editar
 *      credenciais sem acesso ao servidor.
 *   2. Variaveis de ambiente (.env) — comportamento original, mantido como
 *      fallback para quem prefere configurar via infraestrutura.
 *
 * Toda a aplicacao deve depender apenas da interface WhatsappProvider,
 * nunca das classes concretas — assim a troca de provedor nao exige
 * alteracoes em nenhuma outra camada.
 */
export async function getWhatsappProvider(): Promise<WhatsappProvider> {
  if (testOverride) return testOverride;

  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 'singleton' } });
  const providerName = (settings?.provider || process.env.WHATSAPP_PROVIDER || 'evolution_api') as WhatsappProviderName;

  if (providerName === 'baileys') {
    // Baileys embutido: sem credenciais. O socket vive no worker (baileys-connection.manager).
    return new BaileysProvider();
  }

  if (providerName === 'meta_cloud_api') {
    return new MetaCloudApiProvider({
      token: settings?.metaToken || requireEnv('META_WHATSAPP_TOKEN'),
      phoneNumberId: settings?.metaPhoneNumberId || requireEnv('META_WHATSAPP_PHONE_NUMBER_ID'),
      graphApiVersion: settings?.metaGraphApiVersion || process.env.META_GRAPH_API_VERSION || 'v21.0',
      webhookVerifyToken: settings?.metaWebhookVerifyToken || requireEnv('META_WEBHOOK_VERIFY_TOKEN'),
      appSecret: settings?.metaAppSecret || process.env.META_APP_SECRET,
    });
  }

  if (providerName === 'evolution_api') {
    return new EvolutionApiProvider({
      apiUrl: settings?.evolutionApiUrl || requireEnv('EVOLUTION_API_URL'),
      apiKey: settings?.evolutionApiKey || requireEnv('EVOLUTION_API_KEY'),
      instanceName: settings?.evolutionInstanceName || requireEnv('EVOLUTION_INSTANCE_NAME'),
      webhookSecret: settings?.evolutionWebhookSecret || process.env.EVOLUTION_WEBHOOK_SECRET,
    });
  }

  if (providerName === 'twilio') {
    return new TwilioWhatsappProvider({
      accountSid: settings?.twilioAccountSid || requireEnv('TWILIO_ACCOUNT_SID'),
      authToken: settings?.twilioAuthToken || requireEnv('TWILIO_AUTH_TOKEN'),
      whatsappNumber: settings?.twilioWhatsappNumber || requireEnv('TWILIO_WHATSAPP_NUMBER'),
    });
  }

  throw new Error(`Provider de WhatsApp desconhecido: ${providerName}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Configuracao do WhatsApp ausente (${name}). Configure em Configurações → WhatsApp no painel, ou defina a variavel de ambiente.`,
    );
  }
  return value;
}

/** Usado apenas em testes para injetar um provider mockado. */
export function __setWhatsappProviderForTests(provider: WhatsappProvider | null) {
  testOverride = provider;
}
