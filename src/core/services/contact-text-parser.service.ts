import { normalizePhone } from './phone-normalizer.service';

export interface ParsedTextContact {
  name: string | null;
  phone: string | null;
  rawLine: string;
}

// Aceita separadores comuns: "-", "–", ":", "|", tab, ou apenas espacos antes do numero.
const LINE_SEPARATOR_REGEX = /\s*[-–—:|]\s*|\s{2,}/;
const PHONE_REGEX = /(\+?\d[\d\s().-]{7,}\d)/;

/**
 * Parser "inteligente" de texto livre para extracao de contatos enviados
 * como mensagem simples ao WhatsApp do sistema. Suporta:
 *   "João - 21999999999"
 *   "Maria: 21988888888"
 *   "Carlos | 21977777777"
 *   "21999999999 João"
 *   multiplos contatos, um por linha
 */
export function parseContactsFromText(text: string): ParsedTextContact[] {
  if (!text) return [];

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  return lines.map(parseSingleLine).filter((c): c is ParsedTextContact => c !== null);
}

function parseSingleLine(line: string): ParsedTextContact | null {
  const phoneMatch = line.match(PHONE_REGEX);
  if (!phoneMatch) {
    // Linha sem numero identificavel — sera enviada para revisao manual.
    return { name: line || null, phone: null, rawLine: line };
  }

  const rawPhone = phoneMatch[0];
  const phone = normalizePhone(rawPhone);

  const remainder = line.replace(rawPhone, '').split(LINE_SEPARATOR_REGEX).join(' ').trim();
  const name = remainder.replace(/\s+/g, ' ').trim() || null;

  return { name, phone, rawLine: line };
}
