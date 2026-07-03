/**
 * Gerencia o pareamento (QR Code) de uma instancia da Evolution API.
 * Isso e especifico da Evolution API (baseada no Baileys/WhatsApp Web) —
 * a WhatsApp Cloud API da Meta nao tem esse conceito, pois a conexao e
 * feita via credenciais de app, nao QR Code.
 *
 * OBS: os payloads exatos podem variar levemente entre versoes da Evolution
 * API. Este servico tenta os campos mais comuns de cada resposta e falha de
 * forma explicita caso o formato mude — ajuste aqui se a sua versao divergir.
 */

export interface EvolutionConnectionConfig {
  apiUrl: string;
  apiKey: string;
  instanceName: string;
}

export interface QrCodeResult {
  base64: string | null; // data URI (data:image/png;base64,....) pronto para <img src>
  pairingCode: string | null;
}

export type EvolutionConnectionState = 'open' | 'connecting' | 'close' | 'unknown';

async function request(config: EvolutionConnectionConfig, method: string, path: string, body?: unknown) {
  const res = await fetch(`${config.apiUrl}${path}`, {
    method,
    headers: { apikey: config.apiKey, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let json: any = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // resposta nao-JSON (raro) — devolve o texto bruto para diagnostico
  }

  if (!res.ok) {
    throw new Error(`Evolution API (${method} ${path}) retornou ${res.status}: ${text.slice(0, 300)}`);
  }

  return json;
}

/** Garante que a instancia existe (cria se necessario) e retorna o QR Code para pareamento. */
export async function connectEvolutionInstance(config: EvolutionConnectionConfig): Promise<QrCodeResult> {
  // Tenta conectar direto (instancia ja pode existir de uma configuracao anterior).
  try {
    const connectData = await request(config, 'GET', `/instance/connect/${config.instanceName}`);
    const qr = extractQrCode(connectData);
    if (qr.base64 || qr.pairingCode) return qr;
  } catch {
    // instancia provavelmente nao existe ainda — segue para criacao
  }

  await request(config, 'POST', '/instance/create', {
    instanceName: config.instanceName,
    qrcode: true,
    integration: 'WHATSAPP-BAILEYS',
  });

  const connectData = await request(config, 'GET', `/instance/connect/${config.instanceName}`);
  return extractQrCode(connectData);
}

export async function getEvolutionConnectionState(config: EvolutionConnectionConfig): Promise<EvolutionConnectionState> {
  const data = await request(config, 'GET', `/instance/connectionState/${config.instanceName}`);
  const state = data?.instance?.state ?? data?.state;
  if (state === 'open' || state === 'connecting' || state === 'close') return state;
  return 'unknown';
}

export async function disconnectEvolutionInstance(config: EvolutionConnectionConfig): Promise<void> {
  await request(config, 'DELETE', `/instance/logout/${config.instanceName}`);
}

function extractQrCode(data: any): QrCodeResult {
  const rawBase64: string | undefined = data?.base64 ?? data?.qrcode?.base64 ?? data?.qr?.base64;
  const base64 = rawBase64 ? (rawBase64.startsWith('data:') ? rawBase64 : `data:image/png;base64,${rawBase64}`) : null;
  const pairingCode: string | null = data?.pairingCode ?? data?.qrcode?.pairingCode ?? null;
  return { base64, pairingCode };
}
