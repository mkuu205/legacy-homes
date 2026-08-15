-- Phase 3: preserve monetary precision without changing existing values.
-- PostgreSQL casts existing finite DOUBLE PRECISION values to NUMERIC(12,2).
ALTER TABLE "bills"
  ALTER COLUMN "unitRate" TYPE NUMERIC(12,2) USING ROUND("unitRate"::numeric, 2),
  ALTER COLUMN "totalAmount" TYPE NUMERIC(12,2) USING ROUND("totalAmount"::numeric, 2),
  ALTER COLUMN "amountPaid" TYPE NUMERIC(12,2) USING ROUND("amountPaid"::numeric, 2),
  ALTER COLUMN "balance" TYPE NUMERIC(12,2) USING ROUND("balance"::numeric, 2);

ALTER TABLE "payments"
  ALTER COLUMN "amount" TYPE NUMERIC(12,2) USING ROUND("amount"::numeric, 2);

-- Existing unique constraints on billNumber, provider identifiers, and receipt/payment
-- relationships remain unchanged. Bill idempotency is enforced by the existing
-- unique MeterReading.billId relation plus the application transaction.
