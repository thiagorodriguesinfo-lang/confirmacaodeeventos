-- Baileys embutido: colunas de QR/comando + fila de saida

ALTER TABLE "whatsapp_settings" ADD COLUMN "baileys_qr" TEXT;
ALTER TABLE "whatsapp_settings" ADD COLUMN "baileys_command" TEXT;

CREATE TABLE "baileys_outbox" (
    "id" TEXT NOT NULL,
    "to" TEXT NOT NULL,
    "text" TEXT,
    "image_url" TEXT,
    "caption" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "provider_message_id" TEXT,
    "error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMP(3),

    CONSTRAINT "baileys_outbox_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "baileys_outbox_status_idx" ON "baileys_outbox"("status");
