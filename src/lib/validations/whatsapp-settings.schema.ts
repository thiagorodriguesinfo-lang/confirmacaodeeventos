import { z } from 'zod';

export const whatsappSettingsSchema = z
  .object({
    provider: z.enum(['baileys', 'evolution_api', 'meta_cloud_api', 'twilio']),
    metaToken: z.string().optional(),
    metaPhoneNumberId: z.string().optional(),
    metaBusinessAccountId: z.string().optional(),
    metaWebhookVerifyToken: z.string().optional(),
    metaAppSecret: z.string().optional(),
    metaGraphApiVersion: z.string().optional(),
    evolutionApiUrl: z.string().optional(),
    evolutionApiKey: z.string().optional(),
    evolutionInstanceName: z.string().optional(),
    evolutionWebhookSecret: z.string().optional(),
    twilioAccountSid: z.string().optional(),
    twilioAuthToken: z.string().optional(),
    twilioWhatsappNumber: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.provider === 'meta_cloud_api') {
      if (!data.metaToken) ctx.addIssue({ code: 'custom', path: ['metaToken'], message: 'Informe o token da Meta Cloud API' });
      if (!data.metaPhoneNumberId) ctx.addIssue({ code: 'custom', path: ['metaPhoneNumberId'], message: 'Informe o Phone Number ID' });
      if (!data.metaWebhookVerifyToken)
        ctx.addIssue({ code: 'custom', path: ['metaWebhookVerifyToken'], message: 'Informe o token de verificação do webhook' });
    }
    if (data.provider === 'evolution_api') {
      if (!data.evolutionApiUrl) ctx.addIssue({ code: 'custom', path: ['evolutionApiUrl'], message: 'Informe a URL da Evolution API' });
      if (!data.evolutionApiKey) ctx.addIssue({ code: 'custom', path: ['evolutionApiKey'], message: 'Informe a API Key' });
      if (!data.evolutionInstanceName)
        ctx.addIssue({ code: 'custom', path: ['evolutionInstanceName'], message: 'Informe o nome da instância' });
    }
    if (data.provider === 'twilio') {
      if (!data.twilioAccountSid) ctx.addIssue({ code: 'custom', path: ['twilioAccountSid'], message: 'Informe o Account SID' });
      if (!data.twilioAuthToken) ctx.addIssue({ code: 'custom', path: ['twilioAuthToken'], message: 'Informe o Auth Token' });
      if (!data.twilioWhatsappNumber)
        ctx.addIssue({ code: 'custom', path: ['twilioWhatsappNumber'], message: 'Informe o número de WhatsApp (ex: +14155238886)' });
    }
  });

export type WhatsappSettingsSchema = z.infer<typeof whatsappSettingsSchema>;
