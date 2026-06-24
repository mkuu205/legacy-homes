-- CreateTable
CREATE TABLE "callback_audits" (
    "id" TEXT NOT NULL,
    "headers" JSONB,
    "payload" JSONB NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "paymentId" TEXT,
    "provider" TEXT NOT NULL DEFAULT 'TUMA',
    "processingResult" TEXT,
    "errorMessage" TEXT,

    CONSTRAINT "callback_audits_pkey" PRIMARY KEY ("id")
);
