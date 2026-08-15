-- Tuma payment integrity: prevent duplicate provider identifiers and callback events.
-- Nullable columns remain nullable; PostgreSQL permits multiple NULL values in these indexes.
-- This migration intentionally does not delete or rewrite existing payment history.
-- The initial production schema omitted callbackFingerprint even though the
-- application schema requires it, so add it before creating its index.
ALTER TABLE "callback_audits"
  ADD COLUMN IF NOT EXISTS "callbackFingerprint" TEXT;

CREATE UNIQUE INDEX "payments_providerTransactionId_key"
  ON "payments" ("providerTransactionId")
  WHERE "providerTransactionId" IS NOT NULL;

CREATE UNIQUE INDEX "payments_merchantRequestId_key"
  ON "payments" ("merchantRequestId")
  WHERE "merchantRequestId" IS NOT NULL;

CREATE UNIQUE INDEX "payments_checkoutRequestId_key"
  ON "payments" ("checkoutRequestId")
  WHERE "checkoutRequestId" IS NOT NULL;

CREATE UNIQUE INDEX "callback_audits_callbackFingerprint_key"
  ON "callback_audits" ("callbackFingerprint")
  WHERE "callbackFingerprint" IS NOT NULL;

CREATE INDEX "payments_billId_status_idx"
  ON "payments" ("billId", "status");

CREATE INDEX "callback_audits_paymentId_receivedAt_idx"
  ON "callback_audits" ("paymentId", "receivedAt");
