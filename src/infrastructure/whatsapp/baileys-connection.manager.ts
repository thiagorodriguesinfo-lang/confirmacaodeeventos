import { rm } from 'node:fs/promises';
import makeWASocket, { useMultiFileAuthState, DisconnectReason, fetchLatestBaileysVersion } from '@whiskeysockets/baileys';
import qrcode from 'qrcode';
import pino from 'pino';
import { prisma } from '@/infrastructure/database/prisma';
import { setBaileysSocket, setBaileysStatus, type BaileysSocketLike, type BaileysStatus } from './baileys-runtime';
import type { InboundMessage } from './whatsapp-provider.interface';

/**
 * Dono do socket Baileys — roda SOMENTE no processo do worker.
 *
 * Guarda a sessao em disco (BAILEYS_AUTH_DIR) para reconectar sozinho, publica
 * QR/status no banco (para o painel exibir) e entrega as mensagens recebidas
 * ao roteador de chatbot/importacao via o callback `onInbound`.
 */

const AUTH_DIR = process.env.BAILEYS_AUTH_DIR || './baileys-auth';

type InboundHandler = (message: InboundMessage) => Promise<unknown>;

let sock: ReturnType<typeof makeWASocket> | null = null;
let starting = false;
let onInboundHandler: InboundHandler | null = null;

async function patchSettings(data: { connectionStatus?: string; baileysQr?: string | null; baileysCommand?: string | null }) {
  await prisma.whatsappSettings.upsert({
    where: { id: 'singleton' },
    create: { id: 'singleton', provider: 'baileys', ...data },
    update: { ...data, lastConnectionCheck: new Date() },
  });
}

async function setStatus(status: BaileysStatus, qr?: string | null) {
  setBaileysStatus(status);
  await patchSettings({
    connectionStatus: status,
    ...(qr !== undefined ? { baileysQr: qr } : {}),
  });
}

/** Inicia (ou reinicia) o socket. Idempotente: chamadas repetidas nao duplicam. */
export async function startBaileysHost(opts: { onInbound: InboundHandler }): Promise<void> {
  onInboundHandler = opts.onInbound;
  if (sock || starting) return;
  starting = true;

  try {
    // eslint-disable-next-line react-hooks/rules-of-hooks -- funcao do Baileys, nao um hook React (nome comeca com "use" por coincidencia)
    const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

    // Descobre a versao atual do WhatsApp Web; se falhar (offline), usa a padrao do Baileys.
    let version: [number, number, number] | undefined;
    try {
      ({ version } = await fetchLatestBaileysVersion());
    } catch {
      version = undefined;
    }

    sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: 'silent' }),
      // marca presenca online para melhorar entrega
      markOnlineOnConnect: true,
    });
    // O tipo do socket do Baileys e mais rico que o minimo que o provider usa.
    setBaileysSocket(sock as unknown as BaileysSocketLike);
    await setStatus('connecting');

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const dataUrl = await qrcode.toDataURL(qr);
        await setStatus('connecting', dataUrl);
      }

      if (connection === 'open') {
        await setStatus('connected', null);
      }

      if (connection === 'close') {
        const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } } | undefined)?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        sock = null;
        setBaileysSocket(null);
        await setStatus('disconnected', loggedOut ? null : undefined);
        if (!loggedOut && onInboundHandler) {
          // queda de rede — reconecta mantendo a sessao
          startBaileysHost({ onInbound: onInboundHandler });
        } else if (loggedOut) {
          // deslogado pelo celular — limpa a sessao para forcar novo QR
          await rm(AUTH_DIR, { recursive: true, force: true });
        }
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify' || !onInboundHandler) return;
      for (const raw of messages) {
        const parsed = mapInbound(raw);
        if (parsed) {
          try {
            await onInboundHandler(parsed);
          } catch (err) {
            console.error('[baileys] erro ao rotear mensagem recebida:', err);
          }
        }
      }
    });
  } finally {
    starting = false;
  }
}

/** Forca uma nova tentativa de conexao (gera QR se nao houver sessao). */
export async function forceBaileysConnect(): Promise<void> {
  if (!onInboundHandler) return;
  if (sock) return; // ja conectado/conectando
  await startBaileysHost({ onInbound: onInboundHandler });
}

/** Desloga, encerra o socket e apaga a sessao salva. */
export async function logoutBaileys(): Promise<void> {
  try {
    await sock?.logout();
  } catch {
    // ignora — pode ja estar caido
  }
  sock = null;
  setBaileysSocket(null);
  await rm(AUTH_DIR, { recursive: true, force: true }).catch(() => {});
  await setStatus('disconnected', null);
}

/** Converte a mensagem bruta do Baileys no formato neutro InboundMessage. */
function mapInbound(raw: any): InboundMessage | null {
  const key = raw?.key;
  if (!key || key.fromMe) return null;
  const remoteJid: string = key.remoteJid ?? '';
  if (!remoteJid.endsWith('@s.whatsapp.net')) return null; // ignora grupos/broadcast

  const waId = `+${remoteJid.split('@')[0]}`;
  const base = {
    provider: 'baileys',
    waId,
    senderName: raw.pushName as string | undefined,
    messageId: key.id as string,
    timestamp: new Date(Number(raw.messageTimestamp ?? Date.now() / 1000) * 1000),
    raw,
  };

  const message = raw.message ?? {};

  if (message.conversation || message.extendedTextMessage?.text) {
    return { ...base, contentType: 'text', text: message.conversation ?? message.extendedTextMessage?.text };
  }

  if (message.imageMessage) {
    return { ...base, contentType: 'image', mediaMimeType: message.imageMessage.mimetype };
  }

  if (message.contactMessage || message.contactsArrayMessage) {
    const contacts = message.contactsArrayMessage?.contacts ?? [message.contactMessage];
    return {
      ...base,
      contentType: 'contacts',
      contacts: contacts.filter(Boolean).map((c: any) => ({ name: c.displayName, phones: [] })),
      // vCard bruto — o VCardParserService extrai os telefones
      text: contacts.filter(Boolean).map((c: any) => c.vcard).join('\n'),
    };
  }

  if (message.locationMessage) {
    return {
      ...base,
      contentType: 'location',
      location: { latitude: message.locationMessage.degreesLatitude, longitude: message.locationMessage.degreesLongitude },
    };
  }

  return { ...base, contentType: 'unknown' };
}
