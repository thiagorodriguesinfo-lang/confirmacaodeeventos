import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getWhatsappProvider } from '@/infrastructure/whatsapp/whatsapp-provider.factory';
import { container } from '@/infrastructure/container';
import { RouteIncomingMessageUseCase } from '@/core/use-cases/chatbot/route-incoming-message.use-case';
import { prisma } from '@/infrastructure/database/prisma';

/**
 * Webhook da Twilio (WhatsApp). Diferente da Meta: o corpo chega como
 * application/x-www-form-urlencoded (nao JSON), e a assinatura
 * (X-Twilio-Signature) e HMAC-SHA1 sobre a URL completa do webhook + os
 * parametros do POST ordenados por chave — nao sobre o corpo bruto.
 * Docs: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 *
 * Mensagens recebidas e atualizacoes de status usam a MESMA URL na Twilio
 * (sem GET de handshake como a Meta).
 */

export async function POST(req: NextRequest) {
  const rawBody = await req.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries());

  const settings = await prisma.whatsappSettings.findUnique({ where: { id: 'singleton' } });
  const authToken = settings?.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN;

  if (authToken) {
    const signature = req.headers.get('x-twilio-signature');
    if (!verifyTwilioSignature(authToken, webhookUrl(), params, signature)) {
      return NextResponse.json({ error: 'Assinatura inválida' }, { status: 401 });
    }
  }

  const provider = await getWhatsappProvider();
  const { messages, statuses } = await provider.receiveWebhook(params);

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

  // A Twilio nao exige um corpo especifico de resposta (nao e TwiML aqui, so recebimento).
  return new NextResponse('', { status: 200 });
}

/**
 * Monta a URL a partir de NEXT_PUBLIC_APP_URL (nao de req.url) — atras de
 * proxy reverso, req.url pode nao refletir o esquema/host publico real
 * (o mesmo problema de hairpin/URL interna ja visto com o Baileys), e a
 * assinatura da Twilio precisa bater exatamente com a URL configurada no
 * console dela.
 */
function webhookUrl(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL}/api/webhooks/twilio`;
}

function verifyTwilioSignature(
  authToken: string,
  requestUrl: string,
  params: Record<string, string>,
  signatureHeader: string | null,
): boolean {
  if (!signatureHeader) return false;

  const data = Object.keys(params)
    .sort()
    .reduce((acc, key) => acc + key + params[key], requestUrl);

  const expected = crypto.createHmac('sha1', authToken).update(data).digest('base64');

  try {
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
  } catch {
    return false;
  }
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
