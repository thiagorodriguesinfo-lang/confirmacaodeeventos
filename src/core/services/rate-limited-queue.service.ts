/** Intervalo base necessario para respeitar N mensagens por minuto. */
export function intervalMsForRate(ratePerMinute: number): number {
  const safeRate = Math.max(1, ratePerMinute);
  return Math.ceil(60_000 / safeRate);
}

/**
 * Envios automatizados via WhatsApp Web (Baileys) sao detectados como spam
 * quando o intervalo entre mensagens e perfeitamente regular. Varia o
 * intervalo em +-30% para parecer um envio manual.
 */
export function jitteredIntervalMs(ratePerMinute: number): number {
  const base = intervalMsForRate(ratePerMinute);
  const jitterFactor = 0.7 + Math.random() * 0.6; // 0.7x a 1.3x
  return Math.round(base * jitterFactor);
}

/**
 * A cada `batchSize` mensagens enviadas em sequencia, faz uma pausa mais
 * longa (imitando uma pessoa que para de digitar) — reduz o risco de o
 * numero ser banido/desconectado por comportamento de disparo em massa.
 */
export function shouldTakeCooldown(sentInBatch: number, batchSize = 40): boolean {
  return sentInBatch > 0 && sentInBatch % batchSize === 0;
}

export function cooldownMs(): number {
  const MIN = 60_000;
  const MAX = 150_000;
  return Math.round(MIN + Math.random() * (MAX - MIN));
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
