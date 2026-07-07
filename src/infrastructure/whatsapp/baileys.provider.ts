import { prisma } from '@/infrastructure/database/prisma';
import { getBaileysSocket, getBaileysStatus } from './baileys-runtime';
import type {
  SendButtonsInput,
  SendImageInput,
  SendResult,
  SendTemplateInput,
  SendTextInput,
  WebhookParseResult,
  WhatsappProvider,
} from './whatsapp-provider.interface';

/**
 * Provider de WhatsApp usando o Baileys EMBUTIDO no proprio sistema (gratis,
 * conecta como o WhatsApp Web via QR Code — sem servico externo).
 *
 * O socket vive apenas no processo do worker (ver baileys-connection.manager).
 * - No worker: `getBaileysSocket()` devolve o socket -> envia direto.
 * - No processo web (confirmacao publica, confirmacao manual): nao ha socket ->
 *   grava na fila `BaileysOutbox` e o worker envia. O canal e o proprio
 *   Postgres, entao nada de API externa.
 */
export class BaileysProvider implements WhatsappProvider {
  readonly name = 'baileys';

  private toJid(phoneE164: string) {
    return `${phoneE164.replace(/^\+/, '').replace(/\D/g, '')}@s.whatsapp.net`;
  }

  private canSendNow() {
    return getBaileysStatus() === 'connected' && getBaileysSocket() !== null;
  }

  private async enqueue(data: { to: string; text?: string; imageUrl?: string; caption?: string }): Promise<SendResult> {
    const row = await prisma.baileysOutbox.create({ data });
    return { providerMessageId: `outbox:${row.id}` };
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    if (!this.canSendNow()) return this.enqueue({ to: input.to, text: input.message });
    const res = await getBaileysSocket()!.sendMessage(this.toJid(input.to), { text: input.message });
    return { providerMessageId: res?.key?.id ?? '', raw: res };
  }

  async sendImage(input: SendImageInput): Promise<SendResult> {
    if (!this.canSendNow()) return this.enqueue({ to: input.to, imageUrl: input.imageUrl, caption: input.caption });
    const res = await getBaileysSocket()!.sendMessage(this.toJid(input.to), {
      image: { url: input.imageUrl },
      caption: input.caption,
    });
    return { providerMessageId: res?.key?.id ?? '', raw: res };
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    // Baileys (WhatsApp Web) nao tem "template aprovado" da Meta — envia como texto.
    const text = (input.components ?? []).map((c) => Object.values(c).join(' ')).join('\n') || input.templateName;
    return this.sendText({ to: input.to, message: text });
  }

  async sendButtons(input: SendButtonsInput): Promise<SendResult> {
    // Botoes interativos do Baileys sao instaveis nas versoes atuais do WhatsApp;
    // enviamos as opcoes como texto numerado (o chatbot ja aceita respostas por texto).
    const lines = input.buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    const footer = input.footerText ? `\n\n${input.footerText}` : '';
    return this.sendText({ to: input.to, message: `${input.bodyText}\n\n${lines}${footer}` });
  }

  // Baileys recebe mensagens por evento de socket (no worker), nao por webhook.
  async receiveWebhook(): Promise<WebhookParseResult> {
    return { messages: [], statuses: [] };
  }

  async markAsRead(): Promise<void> {
    // no-op: exigiria a key completa da mensagem (remoteJid/participant), que nao temos aqui.
  }

  async sendTyping(to: string): Promise<void> {
    if (!this.canSendNow()) return;
    await getBaileysSocket()!.sendPresenceUpdate?.('composing', this.toJid(to));
  }
}
