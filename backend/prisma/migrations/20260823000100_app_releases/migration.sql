-- CreateTable
CREATE TABLE "app_releases" (
    "id" TEXT NOT NULL,
    "platform" TEXT NOT NULL DEFAULT 'ANDROID',
    "versionName" TEXT NOT NULL,
    "versionCode" INTEGER NOT NULL,
    "releaseNotes" TEXT,
    "downloadUrl" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileSizeBytes" INTEGER NOT NULL,
    "checksumSha256" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "maintenanceMode" BOOLEAN NOT NULL DEFAULT false,
    "maintenanceNote" TEXT,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "publishedById" TEXT,

    CONSTRAINT "app_releases_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "app_releases_platform_status_versionCode_idx" ON "app_releases"("platform", "status", "versionCode");
CREATE INDEX "app_releases_maintenanceMode_status_idx" ON "app_releases"("maintenanceMode", "status");

-- AddForeignKey
ALTER TABLE "app_releases" ADD CONSTRAINT "app_releases_publishedById_fkey" FOREIGN KEY ("publishedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
