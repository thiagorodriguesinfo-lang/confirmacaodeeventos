import { prisma } from '@/infrastructure/database/prisma';

/**
 * Ponte painel <-> worker para o Baileys embutido.
 *
 * O socket vive no worker; o painel (processo web) nao o acessa direto. Aqui o
 * painel apenas grava um "comando" e le o status/QR que o worker publica na
 * tabela whatsapp_settings. O canal e o proprio Postgres — sem API externa.
 */

export interface BaileysConnectionView {
  status: string; // disconnected | connecting | connected
  qr: string | null; // data URI pronto para <img src>
}

export async function requestBaileysConnect(): Promise<void> {
  await prisma.whatsappSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', provider: 'baileys', baileysCommand: 'connect', connectionStatus: 'connecting' },
    update: { baileysCommand: 'connect' },
  });
}

export async function requestBaileysDisconnect(): Promise<void> {
  await prisma.whatsappSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', provider: 'baileys', baileysCommand: 'disconnect' },
    update: { baileysCommand: 'disconnect' },
  });
}

export async function getBaileysConnection(): Promise<BaileysConnectionView> {
  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 'singleton' } });
  return { status: settings?.connectionStatus ?? 'disconnected', qr: settings?.baileysQr ?? null };
}
