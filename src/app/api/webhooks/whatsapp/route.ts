import { NextRequest, NextResponse } from 'next/server';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';
import { container } from '@/infrastructure/container';
import { RouteIncomingMessageUseCase } from '@/core/use-cases/chatbot/route-incoming-message.use-case';
import { prisma } from '@/infrastructure/database/prisma';

/**
 * Webhook da WhatsApp Cloud API (Meta).
 * GET: handshake de verificacao (hub.challenge).
 * POST: recebimento de mensagens e atualizacoes de status.
 */

export async function GET(req: NextRequest) {
  const provider = await getWhatsappProvider();
  if (!provider.verifyWebhookChallenge) return NextResponse.json({ error: 'Provider nao suporta verificacao' }, { status: 400 });

  const challenge = provider.verifyWebhookChallenge(req.nextUrl.searchParams);
  if (challenge === null) return NextResponse.json({ error: 'Token de verificacao invalido' }, { status: 403 });

  return new NextResponse(challenge, { status: 200 });
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = await getWhatsappProvider();

  if (provider.verifyWebhookSignature) {
    const signature = req.headers.get('x-hub-signature-256');
    const isValid = provider.verifyWebhookSignature(rawBody, signature);
    if (!isValid) {
      return NextResponse.json({ error: 'Assinatura invalida' }, { status: 401 });
    }
  }

  const body = JSON.parse(rawBody);
  const { messages, statuses } = await provider.receiveWebhook(body);

  const router = new RouteIncomingMessageUseCase(
    container.guestRepository,
    container.conversationRepository,
    container.messageRepository,
    container.importRepository,
    provider,
  );

  for (const message of messages) {
    await router.execute(message);
  }

  for (const status of statuses) {
    await container.messageRepository.updateStatusByProviderMessageId(status.providerMessageId, mapStatus(status.status), {
      deliveredAt: status.status === 'delivered' ? status.timestamp : undefined,
      readAt: status.status === 'read' ? status.timestamp : undefined,
    });
    await prisma.whatsappLog.create({
      data: { direction: 'INBOUND', provider: provider.name, eventType: 'status', payload: status as unknown as object },
    });
  }

  return NextResponse.json({ received: true });
}

function mapStatus(status: string) {
  const map: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
    sent: 'SENT',
    delivered: 'DELIVERED',
    read: 'READ',
    failed: 'FAILED',
  };
  return map[status] ?? 'SENT';
}
