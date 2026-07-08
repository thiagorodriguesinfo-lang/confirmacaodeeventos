'use server';

import { getServerSession } from 'next-auth';
import { revalidatePath } from 'next/cache';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/infrastructure/database/prisma';
import { whatsappSettingsSchema } from '@/lib/validations/whatsapp-settings.schema';
import {
  connectEvolutionInstance,
  disconnectEvolutionInstance,
  getEvolutionConnectionState,
} from '@/core/services/evolution-connection.service';
import {
  getBaileysConnection,
  requestBaileysConnect,
  requestBaileysDisconnect,
} from '@/core/services/baileys-connection.service';

async function requireAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user || session.user.role !== 'ADMIN') throw new Error('Apenas administradores podem configurar o WhatsApp');
  return session;
}

export async function getWhatsappSettingsAction() {
  await requireAdmin();
  return prisma.whatsappSettings.findUnique({ where: { id: 'singleton' } });
}

export async function saveWhatsappSettingsAction(formData: FormData) {
  const session = await requireAdmin();

  const parsed = whatsappSettingsSchema.safeParse({
    provider: formData.get('provider'),
    metaToken: formData.get('metaToken') || undefined,
    metaPhoneNumberId: formData.get('metaPhoneNumberId') || undefined,
    metaBusinessAccountId: formData.get('metaBusinessAccountId') || undefined,
    metaWebhookVerifyToken: formData.get('metaWebhookVerifyToken') || undefined,
    metaAppSecret: formData.get('metaAppSecret') || undefined,
    metaGraphApiVersion: formData.get('metaGraphApiVersion') || undefined,
    evolutionApiUrl: formData.get('evolutionApiUrl') || undefined,
    evolutionApiKey: formData.get('evolutionApiKey') || undefined,
    evolutionInstanceName: formData.get('evolutionInstanceName') || undefined,
    evolutionWebhookSecret: formData.get('evolutionWebhookSecret') || undefined,
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Dados inválidos' };
  }

  const data = parsed.data;

  await prisma.whatsappSettings.upsert({
    where: { id: 'singleton' },
    create: {
      id: 'singleton',
      provider: data.provider,
      metaToken: data.metaToken,
      metaPhoneNumberId: data.metaPhoneNumberId,
      metaBusinessAccountId: data.metaBusinessAccountId,
      metaWebhookVerifyToken: data.metaWebhookVerifyToken,
      metaAppSecret: data.metaAppSecret,
      metaGraphApiVersion: data.metaGraphApiVersion || 'v21.0',
      evolutionApiUrl: data.evolutionApiUrl,
      evolutionApiKey: data.evolutionApiKey,
      evolutionInstanceName: data.evolutionInstanceName,
      evolutionWebhookSecret: data.evolutionWebhookSecret,
      updatedById: session.user.id,
    },
    update: {
      provider: data.provider,
      metaToken: data.metaToken,
      metaPhoneNumberId: data.metaPhoneNumberId,
      metaBusinessAccountId: data.metaBusinessAccountId,
      metaWebhookVerifyToken: data.metaWebhookVerifyToken,
      metaAppSecret: data.metaAppSecret,
      metaGraphApiVersion: data.metaGraphApiVersion || 'v21.0',
      evolutionApiUrl: data.evolutionApiUrl,
      evolutionApiKey: data.evolutionApiKey,
      evolutionInstanceName: data.evolutionInstanceName,
      evolutionWebhookSecret: data.evolutionWebhookSecret,
      updatedById: session.user.id,
      // Configuracao mudou — o status de conexao anterior deixa de ser valido.
      connectionStatus: 'disconnected',
    },
  });

  revalidatePath('/dashboard/settings/whatsapp');
  return { success: true, message: 'Configurações salvas com sucesso' };
}

async function requireEvolutionConfig() {
  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 'singleton' } });
  if (!settings?.evolutionApiUrl || !settings.evolutionApiKey || !settings.evolutionInstanceName) {
    throw new Error('Salve as credenciais da Evolution API antes de conectar');
  }
  return {
    apiUrl: settings.evolutionApiUrl,
    apiKey: settings.evolutionApiKey,
    instanceName: settings.evolutionInstanceName,
  };
}

export async function connectEvolutionAction() {
  await requireAdmin();

  try {
    const config = await requireEvolutionConfig();
    const qr = await connectEvolutionInstance(config);
    await prisma.whatsappSettings.update({
      where: { id: 'singleton' },
      data: { connectionStatus: 'connecting', lastConnectionCheck: new Date() },
    });
    revalidatePath('/dashboard/settings/whatsapp');
    return { success: true as const, qr };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Falha ao conectar' };
  }
}

export async function checkEvolutionConnectionAction() {
  await requireAdmin();

  try {
    const config = await requireEvolutionConfig();
    const state = await getEvolutionConnectionState(config);
    const status = state === 'open' ? 'connected' : state === 'connecting' ? 'connecting' : 'disconnected';

    await prisma.whatsappSettings.update({
      where: { id: 'singleton' },
      data: { connectionStatus: status, lastConnectionCheck: new Date() },
    });

    revalidatePath('/dashboard/settings/whatsapp');
    return { success: true as const, status };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Falha ao verificar status' };
  }
}

export async function disconnectEvolutionAction() {
  await requireAdmin();

  try {
    const config = await requireEvolutionConfig();
    await disconnectEvolutionInstance(config);
    await prisma.whatsappSettings.update({
      where: { id: 'singleton' },
      data: { connectionStatus: 'disconnected', lastConnectionCheck: new Date() },
    });
    revalidatePath('/dashboard/settings/whatsapp');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Falha ao desconectar' };
  }
}

// --- Baileys embutido (o worker mantem o socket; aqui so trocamos dados via DB) ---

export async function connectBaileysAction() {
  await requireAdmin();
  try {
    await requestBaileysConnect();
    revalidatePath('/dashboard/settings/whatsapp');
    const { status, qr } = await getBaileysConnection();
    return { success: true as const, status, qr };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Falha ao solicitar conexão' };
  }
}

export async function checkBaileysConnectionAction() {
  await requireAdmin();
  try {
    const { status, qr } = await getBaileysConnection();
    return { success: true as const, status, qr };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Falha ao verificar status' };
  }
}

export async function disconnectBaileysAction() {
  await requireAdmin();
  try {
    await requestBaileysDisconnect();
    revalidatePath('/dashboard/settings/whatsapp');
    return { success: true as const };
  } catch (error) {
    return { success: false as const, message: error instanceof Error ? error.message : 'Falha ao desconectar' };
  }
}

/**
 * Duas coisas podem representar "mensagens na fila" no sistema:
 * 1. BaileysOutbox — usada quando o processo web precisa enviar uma
 *    mensagem (ex: agradecimento apos confirmacao) mas o socket do
 *    WhatsApp so existe no worker; fica registrada aqui ate o worker
 *    drenar. Se o numero ficou desconectado por um tempo, se acumula.
 * 2. DispatchJob ativo (QUEUED/RUNNING/PAUSED) — um disparo em massa que
 *    ainda tem convidados por enviar.
 */
export async function getSendQueueStatusAction() {
  await requireAdmin();
  const [outboxPending, outboxFailed, activeJobs] = await Promise.all([
    prisma.baileysOutbox.count({ where: { status: 'PENDING' } }),
    prisma.baileysOutbox.count({ where: { status: 'FAILED' } }),
    prisma.dispatchJob.findMany({
      where: { status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] } },
      select: { id: true, status: true, totalTargets: true, sentCount: true, event: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);
  return { outboxPending, outboxFailed, activeJobs };
}

export async function clearSendQueueAction() {
  await requireAdmin();
  const [outboxResult, jobsResult] = await Promise.all([
    prisma.baileysOutbox.deleteMany({ where: { status: { in: ['PENDING', 'FAILED'] } } }),
    prisma.dispatchJob.updateMany({
      where: { status: { in: ['QUEUED', 'RUNNING', 'PAUSED'] } },
      data: { status: 'CANCELLED', finishedAt: new Date() },
    }),
  ]);
  revalidatePath('/dashboard/settings/whatsapp');
  return { success: true as const, outboxCount: outboxResult.count, jobsCount: jobsResult.count };
}
