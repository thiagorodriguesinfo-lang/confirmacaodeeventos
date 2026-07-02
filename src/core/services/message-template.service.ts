export interface TemplateVariables {
  nome?: string;
  evento?: string;
  data?: string;
  hora?: string;
  local?: string;
  maps?: string;
  link?: string;
}

/**
 * Substitui variaveis {{nome}}, {{evento}}, {{data}}, {{hora}}, {{local}},
 * {{maps}} no template de mensagem configurado pelo administrador do evento.
 */
export function renderTemplate(template: string, variables: TemplateVariables): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (match, key: string) => {
    const value = variables[key as keyof TemplateVariables];
    return value !== undefined ? value : match;
  });
}

export const DEFAULT_INVITE_MESSAGE = `Olá {{nome}}! 🎉

Você está convidado(a) para *{{evento}}*.

📅 Data: {{data}}
🕒 Horário: {{hora}}
📍 Local: {{local}}

Será um prazer contar com a sua presença!

Para confirmar, responda *SIM* ou *NÃO* por aqui, ou acesse o link abaixo:
{{link}}`;

export const DEFAULT_THANK_YOU_MESSAGE = `Obrigado por confirmar, {{nome}}! 💚
Anotamos sua presença. Até lá!`;

export const DEFAULT_DECLINED_MESSAGE = `Tudo bem, {{nome}}. Sentiremos sua falta!
Obrigado por responder. 💙`;

export const DEFAULT_REMINDER_MESSAGE = `Oi {{nome}}! Passando para lembrar do evento *{{evento}}* em {{data}} às {{hora}}. Contamos com você! 🎉`;
