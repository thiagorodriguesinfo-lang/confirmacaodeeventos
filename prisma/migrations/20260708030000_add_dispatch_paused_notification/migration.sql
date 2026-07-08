-- Notifica o admin quando um disparo em massa e pausado automaticamente
-- por queda de conexao do WhatsApp (Baileys), em vez de continuar
-- enfileirando envios as cegas.
ALTER TYPE "NotificationType" ADD VALUE 'DISPATCH_PAUSED';
