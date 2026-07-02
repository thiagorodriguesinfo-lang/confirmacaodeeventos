/** Aguarda o intervalo necessario para respeitar N mensagens por minuto. */
export function intervalMsForRate(ratePerMinute: number): number {
  const safeRate = Math.max(1, ratePerMinute);
  return Math.ceil(60_000 / safeRate);
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
