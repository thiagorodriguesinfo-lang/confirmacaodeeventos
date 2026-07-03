-- AlterEnum
ALTER TYPE "GuestOrigin" ADD VALUE 'STAFF';

-- AlterTable: adiciona staff_token como opcional, popula com um valor unico
-- por linha existente, so entao torna obrigatoria e unica (nao da pra usar
-- DEFAULT direto pois ja existem linhas na tabela).
ALTER TABLE "events" ADD COLUMN "staff_token" TEXT;

UPDATE "events" SET "staff_token" = gen_random_uuid()::text WHERE "staff_token" IS NULL;

ALTER TABLE "events" ALTER COLUMN "staff_token" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "events_staff_token_key" ON "events"("staff_token");
