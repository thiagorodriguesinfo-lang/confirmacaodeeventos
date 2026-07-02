/**
 * Interpretador de linguagem natural (NLP leve, baseado em regras) para as
 * respostas mais comuns de um RSVP em portugues. Nao depende de nenhum
 * servico externo — e rapido, previsivel e facil de auditar/testar, o que
 * importa mais aqui do que um modelo de ML para um dominio tao restrito.
 *
 * Caso no futuro seja necessario um entendimento mais amplo, este servico
 * pode ser substituido por uma chamada a um LLM mantendo a mesma assinatura
 * (parseConfirmationIntent / parseQuantityIntent), sem impactar o restante
 * da maquina de estados do chatbot.
 */

export type ConfirmationIntent = 'CONFIRM' | 'DECLINE' | 'UNKNOWN';

const CONFIRM_PATTERNS = [
  /\bsim\b/i,
  /\bconfirmad[oa]\b/i,
  /\bvou\b/i,
  /\bvamos\b/i,
  /\bclaro\b/i,
  /\bpode(m)? contar\b/i,
  /\bestarei l[aá]\b/i,
  /\bestaremos l[aá]\b/i,
  /\beu vou\b/i,
  /\bcom certeza\b/i,
  /\btamo dentro\b/i,
  /\bfechado\b/i,
  /^\s*ok\s*$/i,
  /\bpresente\b/i,
];

const DECLINE_PATTERNS = [
  /\bn[aã]o vou\b/i,
  /\bn[aã]o poderei\b/i,
  /\bn[aã]o consigo\b/i,
  /\bn[aã]o vamos\b/i,
  /\binfelizmente n[aã]o\b/i,
  /\bnao\b/i,
  /\bn[aã]o\b/i,
  /\bimposs[ií]vel\b/i,
  /\bnao poderei comparecer\b/i,
  /\bcancelar\b/i,
  /\bdesist[oi]\b/i,
];

// Padroes negativos tem prioridade: "nao vou" nao deve ser confundido com "vou".
export function parseConfirmationIntent(text: string): ConfirmationIntent {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return 'UNKNOWN';

  if (DECLINE_PATTERNS.some((re) => re.test(normalized))) return 'DECLINE';
  if (CONFIRM_PATTERNS.some((re) => re.test(normalized))) return 'CONFIRM';

  return 'UNKNOWN';
}

const NUMBER_WORDS: Record<string, number> = {
  um: 1,
  uma: 1,
  sozinho: 1,
  sozinha: 1,
  dois: 2,
  duas: 2,
  tres: 3,
  três: 3,
  quatro: 4,
  cinco: 5,
  seis: 6,
  sete: 7,
  oito: 8,
  nove: 9,
  dez: 10,
};

/**
 * Extrai a quantidade total de pessoas de frases como:
 *   "Vou eu e minha esposa" -> 2
 *   "Vamos em quatro" -> 4
 *   "Somos cinco" -> 5
 *   "Vou com dois filhos" -> 3 (titular + 2)
 *   "3" -> 3
 */
export function parseQuantityIntent(text: string): number | null {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return null;

  const digitMatch = normalized.match(/\d+/);
  if (digitMatch) {
    const value = parseInt(digitMatch[0], 10);
    return value > 0 && value < 1000 ? value : null;
  }

  // "vamos em quatro" / "somos cinco" -> numero cardinal isolado representa o TOTAL de pessoas
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    const totalPattern = new RegExp(`\\b(somos|vamos( em)?)\\s+${word}\\b`, 'i');
    if (totalPattern.test(normalized)) return value;
  }

  // "vou com dois filhos" / "vou eu e minha esposa" -> titular + acompanhantes citados
  const companionWords = countCompanionMentions(normalized);
  if (companionWords > 0) return 1 + companionWords;

  // Apenas um numero cardinal solto ("dois", "tres") sem contexto -> assume total
  for (const [word, value] of Object.entries(NUMBER_WORDS)) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(normalized)) return value;
  }

  return null;
}

function countCompanionMentions(normalized: string): number {
  let count = 0;

  // "dois filhos", "tres amigos" etc: numero cardinal + substantivo de acompanhante
  const explicitCountMatch = normalized.match(
    /\b(um|uma|dois|duas|tres|três|quatro|cinco|seis|sete|oito|nove|dez)\s+(filhos?|filhas?|amigos?|convidados?|pessoas?)\b/,
  );
  const matchedWord = explicitCountMatch?.[1];
  if (matchedWord) {
    return NUMBER_WORDS[matchedWord] ?? 0;
  }

  // "eu e minha esposa", "eu e meu filho" -> cada "e + alguem" soma 1 acompanhante
  const conjunctionMatches = normalized.match(/\be\s+(minha|meu|mais)\s+\w+/g);
  if (conjunctionMatches) count += conjunctionMatches.length;

  return count;
}
