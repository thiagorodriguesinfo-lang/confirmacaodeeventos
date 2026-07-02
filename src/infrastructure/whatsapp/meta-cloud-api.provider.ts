import crypto from 'crypto';
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

interface MetaProviderConfig {
  token: string;
  phoneNumberId: string;
  graphApiVersion: string;
  webhookVerifyToken: string;
  appSecret?: string;
}

/**
 * Implementacao do WhatsappProvider usando a WhatsApp Cloud API oficial da Meta.
 * Docs: https://developers.facebook.com/docs/whatsapp/cloud-api
 */
export class MetaCloudApiProvider implements WhatsappProvider {
  readonly name = 'meta_cloud_api';

  constructor(private readonly config: MetaProviderConfig) {}

  private get baseUrl() {
    return `https://graph.facebook.com/${this.config.graphApiVersion}/${this.config.phoneNumberId}`;
  }

  private async request(path: string, body: Record<string, unknown>) {
    const res = await fetch(`${this.baseUrl}${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`Meta Cloud API error (${res.status}): ${errorBody}`);
    }

    return res.json();
  }

  private toWaId(phoneE164: string) {
    return phoneE164.replace(/^\+/, '');
  }

  async sendText(input: SendTextInput): Promise<SendResult> {
    const data = await this.request('/messages', {
      messaging_product: 'whatsapp',
      to: this.toWaId(input.to),
      type: 'text',
      text: { body: input.message, preview_url: input.previewUrl ?? false },
    });
    return { providerMessageId: data.messages?.[0]?.id, raw: data };
  }

  async sendImage(input: SendImageInput): Promise<SendResult> {
    const data = await this.request('/messages', {
      messaging_product: 'whatsapp',
      to: this.toWaId(input.to),
      type: 'image',
      image: { link: input.imageUrl, caption: input.caption },
    });
    return { providerMessageId: data.messages?.[0]?.id, raw: data };
  }

  async sendTemplate(input: SendTemplateInput): Promise<SendResult> {
    const data = await this.request('/messages', {
      messaging_product: 'whatsapp',
      to: this.toWaId(input.to),
      type: 'template',
      template: {
        name: input.templateName,
        language: { code: input.languageCode ?? 'pt_BR' },
        components: input.components ?? [],
      },
    });
    return { providerMessageId: data.messages?.[0]?.id, raw: data };
  }

  async sendButtons(input: SendButtonsInput): Promise<SendResult> {
    const data = await this.request('/messages', {
      messaging_product: 'whatsapp',
      to: this.toWaId(input.to),
      type: 'interactive',
      interactive: {
        type: 'button',
        body: { text: input.bodyText },
        footer: input.footerText ? { text: input.footerText } : undefined,
        action: {
          buttons: input.buttons.map((b) => ({
            type: 'reply',
            reply: { id: b.id, title: b.title },
          })),
        },
      },
    });
    return { providerMessageId: data.messages?.[0]?.id, raw: data };
  }

  async markAsRead(providerMessageId: string): Promise<void> {
    await this.request('/messages', {
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: providerMessageId,
    });
  }

  async sendTyping(_to: string): Promise<void> {
    // A Cloud API oficial da Meta nao expoe indicador de "digitando..." publicamente.
    // Mantido como no-op para satisfazer a interface comum entre providers.
    return;
  }

  verifyWebhookChallenge(query: URLSearchParams): string | null {
    const mode = query.get('hub.mode');
    const token = query.get('hub.verify_token');
    const challenge = query.get('hub.challenge');
    if (mode === 'subscribe' && token === this.config.webhookVerifyToken) {
      return challenge;
    }
    return null;
  }

  verifyWebhookSignature(rawBody: string, signatureHeader: string | null): boolean {
    if (!this.config.appSecret || !signatureHeader) return false;
    const expected =
      'sha256=' + crypto.createHmac('sha256', this.config.appSecret).update(rawBody).digest('hex');
    try {
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
    } catch {
      return false;
    }
  }

  async receiveWebhook(rawBody: unknown): Promise<WebhookParseResult> {
    const messages: InboundMessage[] = [];
    const statuses: InboundStatusUpdate[] = [];

    const body = rawBody as {
      entry?: Array<{
        changes?: Array<{
          value?: {
            contacts?: Array<{ profile?: { name?: string }; wa_id?: string }>;
            messages?: Array<Record<string, any>>;
            statuses?: Array<Record<string, any>>;
          };
        }>;
      }>;
    };

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        const profileByWaId = new Map(
          (value.contacts ?? []).map((c) => [c.wa_id, c.profile?.name]),
        );

        for (const msg of value.messages ?? []) {
          messages.push(this.parseInboundMessage(msg, profileByWaId));
        }

        for (const status of value.statuses ?? []) {
          statuses.push({
            provider: this.name,
            providerMessageId: status.id,
            status: status.status,
            timestamp: new Date(Number(status.timestamp) * 1000),
            errorMessage: status.errors?.[0]?.title,
          });
        }
      }
    }

    return { messages, statuses };
  }

  private parseInboundMessage(
    msg: Record<string, any>,
    profileByWaId: Map<string | undefined, string | undefined>,
  ): InboundMessage {
    const waId = `+${msg.from}`;
    const senderName = profileByWaId.get(msg.from);
    const base = {
      provider: this.name,
      waId,
      senderName,
      messageId: msg.id,
      timestamp: new Date(Number(msg.timestamp) * 1000),
      raw: msg,
    };

    switch (msg.type) {
      case 'text':
        return { ...base, contentType: 'text', text: msg.text?.body };
      case 'interactive':
        return {
          ...base,
          contentType: 'button_reply',
          text: msg.interactive?.button_reply?.title,
          buttonReplyId: msg.interactive?.button_reply?.id,
        };
      case 'image':
        return { ...base, contentType: 'image', mediaUrl: msg.image?.id, mediaMimeType: msg.image?.mime_type };
      case 'document':
        return { ...base, contentType: 'document', mediaUrl: msg.document?.id, mediaMimeType: msg.document?.mime_type };
      case 'location':
        return {
          ...base,
          contentType: 'location',
          location: { latitude: msg.location?.latitude, longitude: msg.location?.longitude },
        };
      case 'contacts':
        return {
          ...base,
          contentType: 'contacts',
          contacts: (msg.contacts ?? []).map((c: any) => ({
            name: c.name?.formatted_name,
            phones: (c.phones ?? []).map((p: any) => p.phone ?? p.wa_id).filter(Boolean),
          })),
        };
      default:
        return { ...base, contentType: 'unknown' };
    }
  }
}
