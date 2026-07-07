import { z } from 'zod';

export const whatsappSettingsSchema = z
  .object({
    provider: z.enum(['baileys', 'evolution_api', 'meta_cloud_api']),
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
  });

export type WhatsappSettingsSchema = z.infer<typeof whatsappSettingsSchema>;
