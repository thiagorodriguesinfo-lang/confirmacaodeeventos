import type {
  InboundMessage,
  InboundStatusUpdate,
  SendButtonsInput,
  SendImageInput,
  SendResult,
  SendTemplateInput,
  SendTextInput,
  WebhookParseResult,
  WhatsappProvider,
} from './whatsapp-provider.interface';

interface TwilioProviderConfig {
  accountSid: string;
  authToken: string;
  whatsappNumber: string; // E.164, sem prefixo "whatsapp:" — ex: +14155238886 (sandbox) ou o numero aprovado
}

/**
 * Implementacao do WhatsappProvider usando a API de WhatsApp da Twilio —
 * um BSP (Business Solution Provider) oficial: por baixo roda na mesma
 * WhatsApp Cloud API da Meta, mas a Twilio cuida do numero/aprovacao e
 * oferece o Sandbox para testar sem aprovacao de negocio.
 * Docs: https://www.twilio.com/docs/whatsapp/api
 *
 * Templates aprovados (fora da janela de 24h) e botoes interativos na
 * Twilio exigem a Content API (ContentSid) — fora do escopo inicial
 * (poucas mensagens, dentro da janela de conversa). sendTemplate/sendButtons
 * caem para texto simples, igual ao provider Baileys.
 */
export class TwilioWhatsappProvider implements WhatsappProvider {
  readonly name = 'twilio';

  constructor(private readonly config: TwilioProviderConfig) {}

  private toWhatsappAddress(phoneE164: string) {
    return phoneE164.startsWith('whatsapp:') ? phoneE164 : `whatsapp:${phoneE164}`;
  }

  private async request(params: Record<string, string | undefined>): Promise<{ sid: string; [key: string]: unknown }> {
    const body = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) body.append(key, value);
    }

    const auth = Buffer.from(`${this.config.accountSid}:${this.config.authToken}`).toString('base64');
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${this.config.accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Twilio API error (${res.status}): ${data.message ?? JSON.stringify(data)}`);
    }
    return data;
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    const data = await this.request({
      From: this.toWhatsappAddress(this.config.whatsappNumber),
      To: this.toWhatsappAddress(input.to),
      Body: input.message,
    });
    return { providerMessageId: data.sid, raw: data };
  }

  async sendImage(input: SendImageInput): Promise<SendResult> {
    const data = await this.request({
      From: this.toWhatsappAddress(this.config.whatsappNumber),
      To: this.toWhatsappAddress(input.to),
      Body: input.caption,
      MediaUrl: input.imageUrl,
    });
    return { providerMessageId: data.sid, raw: data };
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    const text = (input.components ?? []).map((c) => Object.values(c).join(' ')).join('\n') || input.templateName;
    return this.sendText({ to: input.to, message: text });
  }

  async sendButtons(input: SendButtonsInput): Promise<SendResult> {
    const lines = input.buttons.map((b, i) => `${i + 1}. ${b.title}`).join('\n');
    const footer = input.footerText ? `\n\n${input.footerText}` : '';
    return this.sendText({ to: input.to, message: `${input.bodyText}\n\n${lines}${footer}` });
  }

  async markAsRead(): Promise<void> {
    // A API da Twilio nao expoe confirmacao de leitura para mensagens recebidas.
  }

  async sendTyping(): Promise<void> {
    // A Twilio nao suporta indicador de "digitando...".
  }

  /**
   * Webhooks da Twilio chegam como application/x-www-form-urlencoded — a
   * rota ja converte o corpo em um objeto simples antes de chamar isto.
   * Mensagem recebida e atualizacao de status usam a MESMA URL de webhook,
   * diferenciadas pela presenca do campo MessageStatus.
   */
  async receiveWebhook(rawBody: unknown): Promise<WebhookParseResult> {
    const params = rawBody as Record<string, string>;
    const messages: InboundMessage[] = [];
    const statuses: InboundStatusUpdate[] = [];

    if (params.MessageStatus) {
      statuses.push({
        provider: this.name,
        providerMessageId: params.MessageSid ?? '',
        status: this.mapStatus(params.MessageStatus),
        timestamp: new Date(),
        errorMessage: params.ErrorMessage || undefined,
      });
      return { messages, statuses };
    }

    if (params.Body !== undefined || Number(params.NumMedia ?? '0') > 0) {
      const numMedia = Number(params.NumMedia ?? '0');
      messages.push({
        provider: this.name,
        waId: (params.From ?? '').replace(/^whatsapp:/, ''),
        senderName: params.ProfileName || undefined,
        messageId: params.MessageSid ?? '',
        timestamp: new Date(),
        contentType: numMedia > 0 ? 'image' : 'text',
        text: params.Body,
        mediaUrl: numMedia > 0 ? params.MediaUrl0 : undefined,
        mediaMimeType: numMedia > 0 ? params.MediaContentType0 : undefined,
        raw: params,
      });
    }

    return { messages, statuses };
  }

  private mapStatus(status: string): InboundStatusUpdate['status'] {
    const map: Record<string, InboundStatusUpdate['status']> = {
      sent: 'sent',
      delivered: 'delivered',
      read: 'read',
      failed: 'failed',
      undelivered: 'failed',
    };
    return map[status] ?? 'sent';
  }
}
