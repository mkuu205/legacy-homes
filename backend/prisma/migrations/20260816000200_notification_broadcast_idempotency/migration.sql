-- Add an optional idempotency key for administrator broadcast retries.
-- Existing notifications remain valid and existing data is preserved.
ALTER TABLE "notifications" ADD COLUMN "idempotencyKey" TEXT;

CREATE UNIQUE INDEX "notifications_idempotencyKey_key"
  ON "notifications"("idempotencyKey");

CREATE INDEX "notifications_createdAt_idx"
  ON "notifications"("createdAt");

