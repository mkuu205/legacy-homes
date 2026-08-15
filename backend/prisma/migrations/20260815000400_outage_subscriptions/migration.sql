-- Create the outage subscription table required by the existing schema.
-- This migration is additive and preserves all existing application data.
CREATE TABLE IF NOT EXISTS "outage_subscriptions" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "subscribedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notifiedAt" TIMESTAMP(3),
    "isNotified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    CONSTRAINT "outage_subscriptions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "outage_subscriptions_email_idx"
  ON "outage_subscriptions" ("email");

CREATE INDEX IF NOT EXISTS "outage_subscriptions_isNotified_isActive_idx"
  ON "outage_subscriptions" ("isNotified", "isActive");
