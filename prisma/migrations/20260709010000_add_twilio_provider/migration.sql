-- Provider Twilio (BSP oficial sobre a WhatsApp Cloud API da Meta)
ALTER TABLE "whatsapp_settings" ADD COLUMN "twilio_account_sid" TEXT;
ALTER TABLE "whatsapp_settings" ADD COLUMN "twilio_auth_token" TEXT;
ALTER TABLE "whatsapp_settings" ADD COLUMN "twilio_whatsapp_number" TEXT;
