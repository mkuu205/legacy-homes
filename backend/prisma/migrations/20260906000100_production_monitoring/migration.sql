CREATE TABLE "monitoring_incidents" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastFailureAt" TIMESTAMP(3),
    "resolvedAt" TIMESTAMP(3),
    "failureCount" INTEGER NOT NULL DEFAULT 1,
    "errorMessage" TEXT,
    "detectionSource" TEXT NOT NULL,
    "alertSentAt" TIMESTAMP(3),
    "recoverySentAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "monitoring_incidents_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "monitoring_checks" (
    "id" TEXT NOT NULL,
    "service" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "responseTimeMs" INTEGER,
    "errorMessage" TEXT,
    "metadata" JSONB,
    "incidentId" TEXT,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "monitoring_checks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "monitoring_incidents_service_status_idx" ON "monitoring_incidents"("service", "status");
CREATE INDEX "monitoring_incidents_status_updatedAt_idx" ON "monitoring_incidents"("status", "updatedAt");
CREATE INDEX "monitoring_checks_service_checkedAt_idx" ON "monitoring_checks"("service", "checkedAt");
CREATE INDEX "monitoring_checks_status_checkedAt_idx" ON "monitoring_checks"("status", "checkedAt");
CREATE INDEX "monitoring_checks_incidentId_idx" ON "monitoring_checks"("incidentId");

ALTER TABLE "monitoring_checks" ADD CONSTRAINT "monitoring_checks_incidentId_fkey" FOREIGN KEY ("incidentId") REFERENCES "monitoring_incidents"("id") ON DELETE SET NULL ON UPDATE CASCADE;
