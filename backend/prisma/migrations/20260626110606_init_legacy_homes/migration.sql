-- Fix for "type already exists" error during migration
-- This script ensures that enums and tables are only created if they don't already exist.

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
        CREATE TYPE "Role" AS ENUM ('SUPER_ADMIN', 'BILLING_OFFICER', 'SUPPORT_AGENT', 'NOTIFICATION_MANAGER', 'READ_ONLY_MANAGER', 'RESIDENT');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'AccountStatus') THEN
        CREATE TYPE "AccountStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'INACTIVE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'RegistrationStatus') THEN
        CREATE TYPE "RegistrationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'HouseStatus') THEN
        CREATE TYPE "HouseStatus" AS ENUM ('OCCUPIED', 'VACANT', 'UNDER_CONSTRUCTION', 'SUSPENDED', 'MAINTENANCE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MeterStatus') THEN
        CREATE TYPE "MeterStatus" AS ENUM ('ACTIVE', 'FAULTY', 'REPLACED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'BillStatus') THEN
        CREATE TYPE "BillStatus" AS ENUM ('PAID', 'PARTIAL', 'UNPAID', 'OVERDUE');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentStatus') THEN
        CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'SUCCESSFUL', 'FAILED', 'CANCELLED', 'REFUNDED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentReconciliationStatus') THEN
        CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('PENDING', 'RECONCILED', 'MISMATCH', 'ORPHANED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketStatus') THEN
        CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'PENDING', 'RESOLVED', 'CLOSED');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TicketCategory') THEN
        CREATE TYPE "TicketCategory" AS ENUM ('BILLING', 'PAYMENT', 'METER', 'TECHNICAL', 'COMPLAINT', 'ACCOUNT');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationType') THEN
        CREATE TYPE "NotificationType" AS ENUM ('MAINTENANCE', 'WATER_OUTAGE', 'BILLING_REMINDER', 'PAYMENT_REMINDER', 'EMERGENCY', 'ESTATE_COMMUNICATION', 'PAYMENT_CONFIRMATION', 'BILLING_ALERT', 'BILL_GENERATED', 'BILL_DUE_SOON', 'BILL_OVERDUE', 'PAYMENT_PENDING', 'PAYMENT_SUCCESSFUL', 'PAYMENT_FAILED', 'PAYMENT_CANCELLED', 'PAYMENT_REFUNDED', 'RECEIPT_READY');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationChannel') THEN
        CREATE TYPE "NotificationChannel" AS ENUM ('IN_APP', 'EMAIL', 'SMS');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'NotificationStatus') THEN
        CREATE TYPE "NotificationStatus" AS ENUM ('PENDING', 'DELIVERED', 'FAILED', 'READ');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentProviderType') THEN
        CREATE TYPE "PaymentProviderType" AS ENUM ('TUMA', 'PAYHERO', 'PESAPAL');
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PaymentMethodType') THEN
        CREATE TYPE "PaymentMethodType" AS ENUM ('MPESA_STK_PUSH', 'BUY_GOODS_STK_PUSH', 'VISA', 'MASTERCARD', 'SAVED_CARD');
    END IF;
END $$;

-- CreateTable
CREATE TABLE IF NOT EXISTS "houses" (
    "id" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "occupancyStatus" "HouseStatus" NOT NULL DEFAULT 'UNDER_CONSTRUCTION',
    "creationDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notes" TEXT,
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "houses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'RESIDENT',
    "accountStatus" "AccountStatus" NOT NULL DEFAULT 'INACTIVE',
    "registrationStatus" "RegistrationStatus" NOT NULL DEFAULT 'PENDING',
    "profilePicture" TEXT,
    "nationalId" TEXT,
    "accountNumber" TEXT NOT NULL,
    "houseId" TEXT,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "otp_codes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "used" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "refresh_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "meters" (
    "id" TEXT NOT NULL,
    "meterNumber" TEXT NOT NULL,
    "meterSerial" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "installationDate" TIMESTAMP(3) NOT NULL,
    "previousReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "currentReading" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "MeterStatus" NOT NULL DEFAULT 'ACTIVE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "meters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "meter_readings" (
    "id" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "readBy" TEXT NOT NULL,
    "billingMonth" TEXT NOT NULL,
    "previousReading" DOUBLE PRECISION NOT NULL,
    "currentReading" DOUBLE PRECISION NOT NULL,
    "unitsConsumed" DOUBLE PRECISION NOT NULL,
    "photoUrl" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "billId" TEXT,

    CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "bills" (
    "id" TEXT NOT NULL,
    "billNumber" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "houseId" TEXT NOT NULL,
    "meterId" TEXT NOT NULL,
    "readingId" TEXT,
    "billingMonth" TEXT NOT NULL,
    "billingPeriodStart" TIMESTAMP(3) NOT NULL,
    "billingPeriodEnd" TIMESTAMP(3) NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dueDate" TIMESTAMP(3) NOT NULL,
    "paidAt" TIMESTAMP(3),
    "previousReading" DOUBLE PRECISION NOT NULL,
    "currentReading" DOUBLE PRECISION NOT NULL,
    "unitsConsumed" DOUBLE PRECISION NOT NULL,
    "unitRate" DOUBLE PRECISION NOT NULL DEFAULT 250,
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "balance" DOUBLE PRECISION NOT NULL,
    "status" "BillStatus" NOT NULL DEFAULT 'UNPAID',
    "isLocked" BOOLEAN NOT NULL DEFAULT false,
    "paymentProvider" "PaymentProviderType",
    "paymentMethod" "PaymentMethodType",
    "paymentId" TEXT,
    "daysUntilDue" INTEGER,
    "overdueDays" INTEGER,
    "isOverdue" BOOLEAN,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payments" (
    "id" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "paymentMethod" "PaymentMethodType" NOT NULL,
    "residentId" TEXT NOT NULL,
    "billId" TEXT NOT NULL,
    "merchantReference" TEXT,
    "providerTransactionId" TEXT,
    "providerReference" TEXT,
    "providerOrderId" TEXT,
    "providerStatus" TEXT,
    "providerMessage" TEXT,
    "receiptNumber" TEXT,
    "confirmationCode" TEXT,
    "phoneNumber" TEXT,
    "maskedAccount" TEXT,
    "cardBrand" TEXT,
    "currency" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "reconciliationStatus" "PaymentReconciliationStatus" NOT NULL DEFAULT 'PENDING',
    "merchantRequestId" TEXT,
    "checkoutRequestId" TEXT,
    "callbackPayload" JSONB,
    "providerPayload" JSONB,
    "failureReason" TEXT,
    "verificationTimestamp" TIMESTAMP(3),
    "verifiedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "receipts" (
    "id" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "pdfUrl" TEXT,
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "emailed" BOOLEAN NOT NULL DEFAULT false,
    "smsSent" BOOLEAN NOT NULL DEFAULT false,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "payment_methods" (
    "id" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "provider" "PaymentProviderType" NOT NULL,
    "methodType" "PaymentMethodType" NOT NULL,
    "displayName" TEXT NOT NULL,
    "lastFour" TEXT,
    "cardBrand" TEXT,
    "expiryMonth" INTEGER,
    "expiryYear" INTEGER,
    "providerToken" TEXT,
    "phoneNumber" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payment_methods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "tickets" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "residentId" TEXT NOT NULL,
    "assignedTo" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "category" "TicketCategory" NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'OPEN',
    "attachments" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "ticket_replies" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "attachments" TEXT[],
    "isAdmin" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_replies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "notifications" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "channels" "NotificationChannel"[],
    "sentBy" TEXT,
    "targetAll" BOOLEAN NOT NULL DEFAULT false,
    "targetGroup" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "user_notifications" (
    "id" TEXT NOT NULL,
    "notificationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "status" "NotificationStatus" NOT NULL DEFAULT 'PENDING',
    "readAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "resourceId" TEXT,
    "details" JSONB,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "system_settings" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "callback_audits" (
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

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "houses_houseNumber_key" ON "houses"("houseNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_accountNumber_key" ON "users"("accountNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "users_houseId_key" ON "users"("houseId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "refresh_tokens_tokenHash_key" ON "refresh_tokens"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "meters_meterNumber_key" ON "meters"("meterNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "meters_meterSerial_key" ON "meters"("meterSerial");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "meters_houseId_key" ON "meters"("houseId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "meter_readings_billId_key" ON "meter_readings"("billId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "meter_readings_meterId_billingMonth_key" ON "meter_readings"("meterId", "billingMonth");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bills_billNumber_key" ON "bills"("billNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "bills_readingId_key" ON "bills"("readingId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_receiptNumber_key" ON "receipts"("receiptNumber");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "receipts_paymentId_key" ON "receipts"("paymentId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "tickets_ticketId_key" ON "tickets"("ticketId");

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "system_settings_key_key" ON "system_settings"("key");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_houseId_fkey') THEN
        ALTER TABLE "users" ADD CONSTRAINT "users_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'otp_codes_userId_fkey') THEN
        ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'refresh_tokens_userId_fkey') THEN
        ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meters_houseId_fkey') THEN
        ALTER TABLE "meters" ADD CONSTRAINT "meters_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meter_readings_meterId_fkey') THEN
        ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'meter_readings_readBy_fkey') THEN
        ALTER TABLE "meter_readings" ADD CONSTRAINT "meter_readings_readBy_fkey" FOREIGN KEY ("readBy") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_residentId_fkey') THEN
        ALTER TABLE "bills" ADD CONSTRAINT "bills_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_houseId_fkey') THEN
        ALTER TABLE "bills" ADD CONSTRAINT "bills_houseId_fkey" FOREIGN KEY ("houseId") REFERENCES "houses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_meterId_fkey') THEN
        ALTER TABLE "bills" ADD CONSTRAINT "bills_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "meters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'bills_readingId_fkey') THEN
        ALTER TABLE "bills" ADD CONSTRAINT "bills_readingId_fkey" FOREIGN KEY ("readingId") REFERENCES "meter_readings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_billId_fkey') THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_billId_fkey" FOREIGN KEY ("billId") REFERENCES "bills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payments_residentId_fkey') THEN
        ALTER TABLE "payments" ADD CONSTRAINT "payments_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'receipts_paymentId_fkey') THEN
        ALTER TABLE "receipts" ADD CONSTRAINT "receipts_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'payment_methods_residentId_fkey') THEN
        ALTER TABLE "payment_methods" ADD CONSTRAINT "payment_methods_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_residentId_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tickets_assignedTo_fkey') THEN
        ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assignedTo_fkey" FOREIGN KEY ("assignedTo") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_replies_ticketId_fkey') THEN
        ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'ticket_replies_userId_fkey') THEN
        ALTER TABLE "ticket_replies" ADD CONSTRAINT "ticket_replies_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_notifications_notificationId_fkey') THEN
        ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'user_notifications_userId_fkey') THEN
        ALTER TABLE "user_notifications" ADD CONSTRAINT "user_notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
