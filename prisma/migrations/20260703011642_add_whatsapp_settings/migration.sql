-- CreateTable
CREATE TABLE "whatsapp_settings" (
    "id" TEXT NOT NULL DEFAULT 'singleton',
    "provider" TEXT NOT NULL DEFAULT 'evolution_api',
    "meta_token" TEXT,
    "meta_phone_number_id" TEXT,
    "meta_business_account_id" TEXT,
    "meta_webhook_verify_token" TEXT,
    "meta_app_secret" TEXT,
    "meta_graph_api_version" TEXT DEFAULT 'v21.0',
    "evolution_api_url" TEXT,
    "evolution_api_key" TEXT,
    "evolution_instance_name" TEXT,
    "evolution_webhook_secret" TEXT,
    "connection_status" TEXT DEFAULT 'disconnected',
    "last_connection_check" TIMESTAMP(3),
    "updated_by_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "whatsapp_settings_pkey" PRIMARY KEY ("id")
);
