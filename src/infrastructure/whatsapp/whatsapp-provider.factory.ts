import { EvolutionApiProvider } from './evolution-api.provider';
import { MetaCloudApiProvider } from './meta-cloud-api.provider';
import type { WhatsappProvider } from './whatsapp-provider.interface';

export type WhatsappProviderName = 'meta_cloud_api' | 'evolution_api';

let cachedProvider: WhatsappProvider | null = null;

/**
 * Fabrica responsavel por instanciar o WhatsappProvider ativo com base na
 * variavel de ambiente WHATSAPP_PROVIDER. Toda a aplicacao deve depender
 * apenas da interface WhatsappProvider, nunca das classes concretas —
 * assim a troca de provedor nao exige alteracoes em nenhuma outra camada.
 */
export function getWhatsappProvider(): WhatsappProvider {
  if (cachedProvider) return cachedProvider;

  const providerName = (process.env.WHATSAPP_PROVIDER || 'evolution_api') as WhatsappProviderName;

  if (providerName === 'meta_cloud_api') {
    cachedProvider = new MetaCloudApiProvider({
      token: requireEnv('META_WHATSAPP_TOKEN'),
      phoneNumberId: requireEnv('META_WHATSAPP_PHONE_NUMBER_ID'),
      graphApiVersion: process.env.META_GRAPH_API_VERSION || 'v21.0',
      webhookVerifyToken: requireEnv('META_WEBHOOK_VERIFY_TOKEN'),
      appSecret: process.env.META_APP_SECRET,
    });
    return cachedProvider;
  }

  if (providerName === 'evolution_api') {
    cachedProvider = new EvolutionApiProvider({
      apiUrl: requireEnv('EVOLUTION_API_URL'),
      apiKey: requireEnv('EVOLUTION_API_KEY'),
      instanceName: requireEnv('EVOLUTION_INSTANCE_NAME'),
      webhookSecret: process.env.EVOLUTION_WEBHOOK_SECRET,
    });
    return cachedProvider;
  }

  throw new Error(`Provider de WhatsApp desconhecido: ${providerName}`);
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variavel de ambiente obrigatoria ausente: ${name}`);
  }
  return value;
}

/** Usado apenas em testes para injetar um provider mockado. */
export function __setWhatsappProviderForTests(provider: WhatsappProvider | null) {
  cachedProvider = provider;
}
