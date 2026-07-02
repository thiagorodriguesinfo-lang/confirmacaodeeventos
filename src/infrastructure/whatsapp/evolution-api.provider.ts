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

interface EvolutionProviderConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
  webhookSecret?: string;
}

/**
 * Implementacao do WhatsappProvider usando a Evolution API (open source,
 * self-hosted, baseada no Baileys). Docs: https://doc.evolution-api.com
 */
export class EvolutionApiProvider implements WhatsappProvider {
  readonly name = 'evolution_api';

  constructor(private readonly config: EvolutionProviderConfig) {}

  private toRemoteJid(phoneE164: string) {
    return `${phoneE164.replace(/^\+/, '')}@s.whatsapp.net`;
  }

  private fromRemoteJid(remoteJid: string) {
    return `+${remoteJid.split('@')[0]}`;
  }

  private async request(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${this.config.apiUrl}${path}/${this.config.instanceName}`, {
      method: 'POST',
      headers: {
        apikey: this.config.apiKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Evolution API error (${res.status}): ${errorBody}`);
    }

    return res.json();
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    const data = await this.request('/message/sendText', {
      number: input.to.replace(/^\+/, ''),
      options: { delay: 800, presence: 'composing', linkPreview: input.previewUrl ?? false },
      textMessage: { text: input.message },
    });
    return { providerMessageId: data.key?.id ?? data.messageId, raw: data };
  }

  async sendImage(input: SendImageInput): Promise<SendResult> {
    const data = await this.request('/message/sendMedia', {
      number: input.to.replace(/^\+/, ''),
      options: { delay: 800, presence: 'composing' },
      mediaMessage: {
        mediatype: 'image',
        media: input.imageUrl,
        caption: input.caption ?? '',
      },
    });
    return { providerMessageId: data.key?.id ?? data.messageId, raw: data };
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    // Evolution API (Baileys) nao possui o conceito de "template aprovado" da Meta.
    // Reenviamos como texto simples, concatenando os componentes fornecidos.
    const componentsText = (input.components ?? [])
      .map((c) => Object.values(c).join(' '))
      .join('\n');
    return this.sendText({ to: input.to, message: componentsText || input.templateName });
  }

  async sendButtons(input: SendButtonsInput): Promise<SendResult> {
    const data = await this.request('/message/sendButtons', {
      number: input.to.replace(/^\+/, ''),
      options: { delay: 800, presence: 'composing' },
      buttonMessage: {
        text: input.bodyText,
        footer: input.footerText ?? '',
        buttons: input.buttons.map((b) => ({ buttonId: b.id, buttonText: { displayText: b.title }, type: 1 })),
      },
    });
    return { providerMessageId: data.key?.id ?? data.messageId, raw: data };
  }

  async markAsRead(providerMessageId: string): Promise<void> {
    await this.request('/chat/markMessageAsRead', {
      readMessages: [{ id: providerMessageId }],
    });
  }

  async sendTyping(to: string): Promise<void> {
    await this.request('/chat/sendPresence', {
      number: to.replace(/^\+/, ''),
      presence: 'composing',
    });
  }

  verifyWebhookSignature(_rawBody: string, signatureHeader: string | null): boolean {
    if (!this.config.webhookSecret) return true; // segredo opcional na Evolution API
    return signatureHeader === this.config.webhookSecret;
  }

  async receiveWebhook(rawBody: unknown): Promise<WebhookParseResult> {
    const messages: InboundMessage[] = [];
    const statuses: InboundStatusUpdate[] = [];

    const body = rawBody as {
      event?: string;
      data?: Record<string, any>;
    };

    if (body.event === 'messages.upsert') {
      const data = body.data;
      const message = this.parseInboundMessage(data);
      if (message) messages.push(message);
    }

    if (body.event === 'messages.update') {
      const data = body.data;
      const statusMap: Record<string, InboundStatusUpdate['status']> = {
        DELIVERY_ACK: 'delivered',
        READ: 'read',
        SERVER_ACK: 'sent',
        ERROR: 'failed',
      };
      const mapped = data?.status ? statusMap[data.status] : undefined;
      const providerMessageId = data?.key?.id;
      if (mapped && providerMessageId) {
        statuses.push({
          provider: this.name,
          providerMessageId,
          status: mapped,
          timestamp: new Date(),
        });
      }
    }

    return { messages, statuses };
  }

  private parseInboundMessage(data: any): InboundMessage | null {
    if (!data?.key || data.key.fromMe) return null;

    const waId = this.fromRemoteJid(data.key.remoteJid);
    const base = {
      provider: this.name,
      waId,
      senderName: data.pushName,
      messageId: data.key.id,
      timestamp: new Date((data.messageTimestamp ?? Date.now() / 1000) * 1000),
      raw: data,
    };

    const message = data.message ?? {};

    if (message.conversation || message.extendedTextMessage?.text) {
      return { ...base, contentType: 'text', text: message.conversation ?? message.extendedTextMessage?.text };
    }

    if (message.buttonsResponseMessage) {
      return {
        ...base,
        contentType: 'button_reply',
        text: message.buttonsResponseMessage.selectedDisplayText,
        buttonReplyId: message.buttonsResponseMessage.selectedButtonId,
      };
    }

    if (message.imageMessage) {
      return { ...base, contentType: 'image', mediaUrl: message.imageMessage.url, mediaMimeType: message.imageMessage.mimetype };
    }

    if (message.documentMessage) {
      return {
        ...base,
        contentType: 'document',
        mediaUrl: message.documentMessage.url,
        mediaMimeType: message.documentMessage.mimetype,
      };
    }

    if (message.locationMessage) {
      return {
        ...base,
        contentType: 'location',
        location: {
          latitude: message.locationMessage.degreesLatitude,
          longitude: message.locationMessage.degreesLongitude,
        },
      };
    }

    if (message.contactMessage || message.contactsArrayMessage) {
      const contacts = message.contactsArrayMessage?.contacts ?? [message.contactMessage];
      return {
        ...base,
        contentType: 'contacts',
        // vCard bruto vem em cada contato — sera extraido pelo VCardParserService
        contacts: contacts.filter(Boolean).map((c: any) => ({ name: c.displayName, phones: [] })),
        text: contacts
          .filter(Boolean)
          .map((c: any) => c.vcard)
          .join('\n'),
      };
    }

    return { ...base, contentType: 'unknown' };
  }
}
