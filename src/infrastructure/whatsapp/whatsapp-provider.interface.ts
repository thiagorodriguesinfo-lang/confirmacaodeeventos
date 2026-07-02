/**
 * Contrato unico que qualquer integracao de WhatsApp deve implementar.
 * Permite trocar entre WhatsApp Cloud API (Meta) e Evolution API (open source)
 * apenas alterando a variavel de ambiente WHATSAPP_PROVIDER, sem tocar no
 * restante da aplicacao (Dependency Inversion — Clean Architecture).
 */

export interface SendTextInput {
  to: string; // telefone em E.164, ex: +5521999999999
  message: string;
  previewUrl?: boolean;
}

export interface SendImageInput {
  to: string;
  imageUrl: string;
  caption?: string;
}

export interface SendTemplateInput {
  to: string;
  templateName: string;
  languageCode?: string;
  components?: Record<string, unknown>[];
}

export interface WhatsappButton {
  id: string;
  title: string;
}

export interface SendButtonsInput {
  to: string;
  bodyText: string;
  buttons: WhatsappButton[];
  footerText?: string;
}

export type InboundContentType = 'text' | 'image' | 'document' | 'location' | 'contacts' | 'button_reply' | 'unknown';

export interface InboundContact {
  name?: string;
  phones: string[];
}

export interface InboundMessage {
  provider: string;
  waId: string; // telefone de quem enviou, em E.164
  senderName?: string;
  messageId: string;
  timestamp: Date;
  contentType: InboundContentType;
  text?: string;
  mediaUrl?: string;
  mediaMimeType?: string;
  location?: { latitude: number; longitude: number };
  contacts?: InboundContact[];
  buttonReplyId?: string;
  raw: unknown;
}

export interface InboundStatusUpdate {
  provider: string;
  providerMessageId: string;
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: Date;
  errorMessage?: string;
}

export interface WebhookParseResult {
  messages: InboundMessage[];
  statuses: InboundStatusUpdate[];
}

export interface SendResult {
  providerMessageId: string;
  raw?: unknown;
}

/**
 * Interface que toda integracao de WhatsApp deve implementar.
 */
export interface WhatsappProvider {
  readonly name: string;

  sendText(input: SendTextInput): Promise<SendResult>;
  sendImage(input: SendImageInput): Promise<SendResult>;
  sendTemplate(input: SendTemplateInput): Promise<SendResult>;
  sendButtons(input: SendButtonsInput): Promise<SendResult>;

  /** Interpreta o corpo bruto de um webhook recebido em mensagens/atualizacoes normalizadas. */
  receiveWebhook(rawBody: unknown, headers?: Record<string, string>): Promise<WebhookParseResult>;

  markAsRead(providerMessageId: string): Promise<void>;
  sendTyping(to: string): Promise<void>;

  /** Usado apenas por provedores que exigem verificacao de assinatura (Meta). */
  verifyWebhookSignature?(rawBody: string, signatureHeader: string | null): boolean;

  /** Usado apenas no handshake GET de verificacao de webhook (Meta). */
  verifyWebhookChallenge?(query: URLSearchParams): string | null;
}
