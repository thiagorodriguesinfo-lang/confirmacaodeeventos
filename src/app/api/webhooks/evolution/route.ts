import { NextRequest, NextResponse } from 'next/server';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';
import { container } from '@/infrastructure/container';
import { RouteIncomingMessageUseCase } from '@/core/use-cases/chatbot/route-incoming-message.use-case';

/**
 * Webhook da Evolution API (open source / self-hosted).
 * A Evolution API envia um POST por evento (messages.upsert, messages.update, etc.).
 */
export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const provider = await getWhatsappProvider();

  if (provider.verifyWebhookSignature) {
    const signature = req.headers.get('x-webhook-secret') ?? req.headers.get('apikey');
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
    const map: Record<string, 'SENT' | 'DELIVERED' | 'READ' | 'FAILED'> = {
      sent: 'SENT',
      delivered: 'DELIVERED',
      read: 'READ',
      failed: 'FAILED',
    };
    await container.messageRepository.updateStatusByProviderMessageId(status.providerMessageId, map[status.status] ?? 'SENT', {
      deliveredAt: status.status === 'delivered' ? status.timestamp : undefined,
      readAt: status.status === 'read' ? status.timestamp : undefined,
    });
  }

  return NextResponse.json({ received: true });
}
