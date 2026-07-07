/**
 * Referencia em memoria do socket Baileys do processo atual.
 *
 * IMPORTANTE: este arquivo NAO importa o Baileys. Assim o BaileysProvider (que
 * o processo web tambem carrega) permanece leve, e a lib pesada do Baileys so
 * entra no processo que realmente abre o socket (o worker), via
 * `baileys-connection.manager.ts`.
 *
 * No processo web o socket nunca e setado -> o provider cai na fila (outbox).
 * No worker o manager seta o socket aqui -> o provider envia direto.
 */

export type BaileysStatus = 'disconnected' | 'connecting' | 'connected';

// Tipo minimo que o provider precisa do socket — evita depender do tipo do Baileys.
export interface BaileysSocketLike {
  sendMessage(jid: string, content: unknown): Promise<{ key?: { id?: string } } | undefined>;
  readMessages?(keys: unknown[]): Promise<void>;
  sendPresenceUpdate?(type: string, jid?: string): Promise<void>;
}

let socket: BaileysSocketLike | null = null;
let status: BaileysStatus = 'disconnected';

export function setBaileysSocket(s: BaileysSocketLike | null) {
  socket = s;
}

export function getBaileysSocket(): BaileysSocketLike | null {
  return socket;
}

export function setBaileysStatus(s: BaileysStatus) {
  status = s;
}

export function getBaileysStatus(): BaileysStatus {
  return status;
}
