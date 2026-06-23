-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "merchantRequestId" TEXT,
ADD COLUMN     "provider" TEXT NOT NULL DEFAULT 'PAYHERO',
ADD COLUMN     "callbackPayload" JSONB,
ADD COLUMN     "verificationTimestamp" TIMESTAMP(3);

-- Update existing records to PAYHERO
UPDATE "payments" SET "provider" = 'PAYHERO' WHERE "provider" IS NULL;

-- Change default to TUMA for future records
ALTER TABLE "payments" ALTER COLUMN "provider" SET DEFAULT 'TUMA';
