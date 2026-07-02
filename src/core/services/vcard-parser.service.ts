import { normalizePhone } from './phone-normalizer.service';

export interface ParsedVCardContact {
  name: string | null;
  phones: string[];
}

/**
 * Parser de VCard escrito a mao (sem dependencia externa) para extrair
 * nome e telefones de contatos encaminhados pelo WhatsApp.
 * Suporta multiplos blocos BEGIN:VCARD...END:VCARD concatenados, que e
 * exatamente o que a Evolution API / Baileys entrega quando varios
 * contatos sao encaminhados de uma vez.
 */
export function parseVCards(raw: string): ParsedVCardContact[] {
  if (!raw) return [];

  const blocks = raw.match(/BEGIN:VCARD[\s\S]*?END:VCARD/gi) ?? [];
  if (blocks.length === 0) return [];

  return blocks.map(parseSingleVCard).filter((c): c is ParsedVCardContact => c !== null);
}

function parseSingleVCard(block: string): ParsedVCardContact | null {
  const lines = block
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let name: string | null = null;
  const phones: string[] = [];

  for (const line of lines) {
    // Linhas de VCard tem o formato PROPERTY;PARAM=VALUE:CONTENT
    const separatorIndex = line.indexOf(':');
    if (separatorIndex === -1) continue;

    const propertyPart = line.slice(0, separatorIndex).toUpperCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (propertyPart.startsWith('FN')) {
      name = value;
    } else if (!name && propertyPart.startsWith('N') && !propertyPart.startsWith('NOTE')) {
      // N:Sobrenome;Nome;;; — usado como fallback quando FN nao existe
      const parts = value.split(';').filter(Boolean);
      if (parts.length > 0) name = parts.reverse().join(' ');
    } else if (propertyPart.startsWith('TEL')) {
      const normalized = normalizePhone(value);
      if (normalized) phones.push(normalized);
      else if (value) phones.push(value);
    }
  }

  if (!name && phones.length === 0) return null;
  return { name, phones: Array.from(new Set(phones)) };
}
