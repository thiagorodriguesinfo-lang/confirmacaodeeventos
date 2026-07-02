import { parsePhoneNumberWithError } from 'libphonenumber-js';

/**
 * Normaliza numeros de telefone para o formato E.164 (+5521999999999).
 * Assume Brasil (BR) como pais padrao quando o numero nao possui codigo de pais,
 * mas aceita numeros internacionais explicitos (com "+").
 */
export function normalizePhone(raw: string, defaultCountry: 'BR' = 'BR'): string | null {
  if (!raw) return null;

  const cleaned = raw
    .replace(/[^\d+]/g, '')
    .replace(/^00/, '+')
    .trim();

  if (!cleaned) return null;

  try {
    const phoneNumber = parsePhoneNumberWithError(cleaned, cleaned.startsWith('+') ? undefined : defaultCountry);
    if (!phoneNumber.isValid()) return null;
    return phoneNumber.number; // formato E.164
  } catch {
    return null;
  }
}

export function isSamePhone(a: string, b: string): boolean {
  const normalizedA = normalizePhone(a);
  const normalizedB = normalizePhone(b);
  return !!normalizedA && normalizedA === normalizedB;
}
