import { parseConfirmationIntent, parseQuantityIntent } from './nlp-intent.service';

/**
 * Maquina de estados do chatbot de RSVP.
 *
 * NOT_STARTED -> AWAITING_CONFIRMATION -> (SIM) -> AWAITING_PEOPLE -> AWAITING_NAMES -> AWAITING_AGES -> COMPLETED
 *                                      \-> (NAO) -> DECLINED
 *
 * Implementada como funcao pura (sem I/O) para ser facilmente testavel:
 * recebe o estado atual + a mensagem recebida, devolve o proximo estado,
 * o contexto atualizado e as mensagens que devem ser respondidas ao convidado.
 * A camada de use-case (process-incoming-message.use-case.ts) e responsavel
 * por persistir o resultado e efetivamente enviar as mensagens.
 */

export type ChatbotStep =
  | 'NOT_STARTED'
  | 'AWAITING_CONFIRMATION'
  | 'AWAITING_PEOPLE'
  | 'AWAITING_NAMES'
  | 'AWAITING_AGES'
  | 'COMPLETED'
  | 'DECLINED';

export interface RsvpContext {
  totalPeople?: number;
  companionNames?: string[];
  companionAges?: number[];
  invalidAttempts?: number;
}

export interface CompanionResult {
  name: string;
  age: number | null;
}

export interface RsvpStepResult {
  nextStep: ChatbotStep;
  context: RsvpContext;
  outboundMessage: string;
  /** Preenchido apenas quando o fluxo chega em COMPLETED. */
  companions?: CompanionResult[];
  /** Preenchido quando o fluxo chega em COMPLETED ou DECLINED. */
  finalStatus?: 'CONFIRMED' | 'DECLINED';
  /** Quantidade total de pessoas confirmadas (titular + acompanhantes), quando aplicavel. */
  confirmedCount?: number;
}

const MAX_INVALID_ATTEMPTS = 3;

export function processRsvpStep(
  currentStep: ChatbotStep,
  context: RsvpContext,
  incomingText: string,
  templates: { thankYou: string; declined: string },
): RsvpStepResult {
  switch (currentStep) {
    case 'NOT_STARTED':
    case 'AWAITING_CONFIRMATION':
      return handleAwaitingConfirmation(context, incomingText, templates.declined, templates.thankYou);

    case 'AWAITING_PEOPLE':
      return handleAwaitingPeople(context, incomingText, templates.thankYou);

    case 'AWAITING_NAMES':
      return handleAwaitingNames(context, incomingText);

    case 'AWAITING_AGES':
      return handleAwaitingAges(context, incomingText, templates.thankYou);

    case 'COMPLETED':
    case 'DECLINED':
    default:
      return {
        nextStep: currentStep,
        context,
        outboundMessage:
          currentStep === 'COMPLETED'
            ? 'Sua presença já está confirmada. Até lá! 🎉'
            : 'Obrigado pela resposta. Caso mude de ideia, é só nos chamar por aqui!',
      };
  }
}

function handleAwaitingConfirmation(
  context: RsvpContext,
  text: string,
  declinedTemplate: string,
  thankYouTemplate: string,
): RsvpStepResult {
  const intent = parseConfirmationIntent(text);

  if (intent === 'DECLINE') {
    return {
      nextStep: 'DECLINED',
      context,
      outboundMessage: declinedTemplate,
      finalStatus: 'DECLINED',
    };
  }

  if (intent === 'CONFIRM') {
    // O convidado pode ja informar a quantidade na propria confirmacao
    // (ex: "Vamos em quatro", "Vou eu e minha esposa").
    const impliedQuantity = parseQuantityIntent(text);
    if (impliedQuantity && impliedQuantity > 1) {
      return startCollectingNames({ ...context, totalPeople: impliedQuantity }, impliedQuantity);
    }
    if (impliedQuantity === 1) {
      return finalizeCompleted({ ...context, totalPeople: 1, companionNames: [], companionAges: [] }, [], thankYouTemplate);
    }

    return {
      nextStep: 'AWAITING_PEOPLE',
      context,
      outboundMessage: 'Que ótimo! 🎉 Quantas pessoas vão, incluindo você?',
    };
  }

  return withRetry(context, 'AWAITING_CONFIRMATION', 'Não entendi 🤔 Você pode confirmar respondendo *SIM* ou *NÃO*?');
}

function handleAwaitingPeople(context: RsvpContext, text: string, thankYouTemplate: string): RsvpStepResult {
  const quantity = parseQuantityIntent(text);

  if (!quantity || quantity < 1) {
    return withRetry(context, 'AWAITING_PEOPLE', 'Não consegui entender a quantidade. Pode informar um número, ex: "2"?');
  }

  if (quantity === 1) {
    return finalizeCompleted({ ...context, totalPeople: 1, companionNames: [], companionAges: [] }, [], thankYouTemplate);
  }

  return startCollectingNames({ ...context, totalPeople: quantity }, quantity);
}

function startCollectingNames(context: RsvpContext, totalPeople: number): RsvpStepResult {
  const companionsCount = totalPeople - 1;
  return {
    nextStep: 'AWAITING_NAMES',
    context: { ...context, totalPeople, invalidAttempts: 0 },
    outboundMessage: `Perfeito! Me informe o nome ${companionsCount === 1 ? 'do acompanhante' : `dos ${companionsCount} acompanhantes`} (um por linha ou separados por vírgula).`,
  };
}

function handleAwaitingNames(context: RsvpContext, text: string): RsvpStepResult {
  const names = splitList(text);

  if (names.length === 0) {
    return withRetry(context, 'AWAITING_NAMES', 'Não recebi nenhum nome. Pode enviar novamente, um por linha ou separado por vírgula?');
  }

  return {
    nextStep: 'AWAITING_AGES',
    context: { ...context, companionNames: names, invalidAttempts: 0 },
    outboundMessage: `Obrigado! Agora me informe a idade de ${names.length === 1 ? names[0] : 'cada um'} (na mesma ordem, separadas por vírgula).`,
  };
}

function handleAwaitingAges(context: RsvpContext, text: string, thankYouTemplate: string): RsvpStepResult {
  const ages = splitList(text)
    .map((a) => parseInt(a.replace(/\D/g, ''), 10))
    .filter((a) => !Number.isNaN(a));

  const names = context.companionNames ?? [];

  if (ages.length === 0) {
    return withRetry(context, 'AWAITING_AGES', 'Não consegui entender as idades. Pode enviar como números separados por vírgula, ex: "5, 32"?');
  }

  const companions: CompanionResult[] = names.map((name, i) => ({
    name,
    age: ages[i] ?? null,
  }));

  return finalizeCompleted({ ...context, companionAges: ages }, companions, thankYouTemplate);
}

function finalizeCompleted(context: RsvpContext, companions: CompanionResult[], thankYouTemplate: string): RsvpStepResult {
  const confirmedCount = context.totalPeople ?? 1 + companions.length;
  return {
    nextStep: 'COMPLETED',
    context,
    outboundMessage: thankYouTemplate,
    companions,
    finalStatus: 'CONFIRMED',
    confirmedCount,
  };
}

function withRetry(context: RsvpContext, step: ChatbotStep, message: string): RsvpStepResult {
  const attempts = (context.invalidAttempts ?? 0) + 1;

  if (attempts >= MAX_INVALID_ATTEMPTS) {
    return {
      nextStep: step,
      context: { ...context, invalidAttempts: attempts },
      outboundMessage:
        'Não consegui entender sua resposta. Um de nossos organizadores vai continuar essa conversa com você em breve. 🙏',
    };
  }

  return {
    nextStep: step,
    context: { ...context, invalidAttempts: attempts },
    outboundMessage: message,
  };
}

function splitList(text: string): string[] {
  return text
    .split(/[,\n;]/)
    .map((s) => s.trim())
    .filter(Boolean);
}
