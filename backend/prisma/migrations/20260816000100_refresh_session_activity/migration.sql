ALTER TABLE "refresh_tokens"
ADD COLUMN IF NOT EXISTS "lastActivityAt" TIMESTAMP(3);

UPDATE "refresh_tokens"
SET "lastActivityAt" = "createdAt"
WHERE "lastActivityAt" IS NULL;
