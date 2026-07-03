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
