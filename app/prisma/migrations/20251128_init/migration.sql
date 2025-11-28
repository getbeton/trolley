-- CreateEnum
CREATE TYPE "CredentialType" AS ENUM ('TWENTY_BASE_URL', 'TWENTY_API_TOKEN', 'TOOL_TOKEN', 'ATTIO_API_TOKEN', 'NOTIFICATION_WEBHOOK');

-- CreateEnum
CREATE TYPE "CredentialStatus" AS ENUM ('PENDING', 'VALID', 'INVALID', 'ERROR');

-- CreateEnum
CREATE TYPE "CrmSystem" AS ENUM ('TWENTY', 'ATTIO', 'INTERNAL');

-- CreateEnum
CREATE TYPE "SelectionStatus" AS ENUM ('PENDING', 'FETCHING', 'READY', 'ERROR');

-- CreateEnum
CREATE TYPE "MigrationStatus" AS ENUM ('DRAFT', 'COLLECTING', 'VALIDATING', 'READY', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "RunStatus" AS ENUM ('QUEUED', 'RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "LogLevel" AS ENUM ('DEBUG', 'INFO', 'WARN', 'ERROR');

-- CreateEnum
CREATE TYPE "WebhookStatus" AS ENUM ('PENDING', 'RETRYING', 'DELIVERED', 'FAILED');

-- CreateEnum
CREATE TYPE "WebhookEvent" AS ENUM ('MIGRATION_COMPLETED', 'MIGRATION_FAILED', 'RUN_PROGRESS');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT,
    "displayName" TEXT,
    "organization" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Credential" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "type" "CredentialType" NOT NULL,
    "label" TEXT,
    "secret" TEXT NOT NULL,
    "status" "CredentialStatus" NOT NULL DEFAULT 'PENDING',
    "lastValidatedAt" TIMESTAMP(3),
    "validationMessage" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Credential_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntitySelection" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "migrationId" TEXT,
    "system" "CrmSystem" NOT NULL,
    "entityName" TEXT NOT NULL,
    "entityLabel" TEXT,
    "status" "SelectionStatus" NOT NULL DEFAULT 'PENDING',
    "includeInSync" BOOLEAN NOT NULL DEFAULT false,
    "availableFieldCount" INTEGER,
    "sampleRecord" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EntitySelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldSelection" (
    "id" TEXT NOT NULL,
    "entitySelectionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "fieldLabel" TEXT,
    "fieldType" TEXT,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "isSelected" BOOLEAN NOT NULL DEFAULT false,
    "sampleValue" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldSelection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Migration" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "MigrationStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceSystem" "CrmSystem" NOT NULL DEFAULT 'TWENTY',
    "targetSystem" "CrmSystem" NOT NULL DEFAULT 'ATTIO',
    "config" JSONB,
    "recordEstimate" INTEGER,
    "etaSeconds" INTEGER,
    "lastRunAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Migration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationRun" (
    "id" TEXT NOT NULL,
    "migrationId" TEXT NOT NULL,
    "status" "RunStatus" NOT NULL DEFAULT 'QUEUED',
    "progress" DOUBLE PRECISION,
    "etaSeconds" INTEGER,
    "recordsProcessed" INTEGER,
    "batchesProcessed" INTEGER,
    "rateLimitHitCount" INTEGER,
    "errorMessage" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "metrics" JSONB,

    CONSTRAINT "MigrationRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MigrationLog" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "level" "LogLevel" NOT NULL DEFAULT 'INFO',
    "message" TEXT NOT NULL,
    "context" JSONB,
    "entityReference" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MigrationLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FieldMapping" (
    "id" TEXT NOT NULL,
    "migrationId" TEXT NOT NULL,
    "sourceFieldId" TEXT NOT NULL,
    "targetFieldId" TEXT NOT NULL,
    "transformation" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FieldMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebhookNotification" (
    "id" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "event" "WebhookEvent" NOT NULL,
    "status" "WebhookStatus" NOT NULL DEFAULT 'PENDING',
    "targetUrl" TEXT NOT NULL,
    "payload" JSONB,
    "responseStatusCode" INTEGER,
    "responseBody" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookNotification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "idx_credentials_user_type" ON "Credential"("userId", "type");

-- CreateIndex
CREATE UNIQUE INDEX "unique_credential_per_user_type" ON "Credential"("userId", "type");

-- CreateIndex
CREATE INDEX "idx_entity_selection_migration_system" ON "EntitySelection"("migrationId", "system");

-- CreateIndex
CREATE UNIQUE INDEX "unique_entity_per_user_system" ON "EntitySelection"("userId", "system", "entityName");

-- CreateIndex
CREATE INDEX "idx_field_selection_entity_field" ON "FieldSelection"("entitySelectionId", "fieldName");

-- CreateIndex
CREATE INDEX "idx_migration_user_status" ON "Migration"("userId", "status");

-- CreateIndex
CREATE INDEX "idx_run_migration_status" ON "MigrationRun"("migrationId", "status");

-- CreateIndex
CREATE INDEX "idx_log_run_level" ON "MigrationLog"("runId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "unique_field_mapping_triplet" ON "FieldMapping"("migrationId", "sourceFieldId", "targetFieldId");

-- CreateIndex
CREATE INDEX "idx_webhook_run_status" ON "WebhookNotification"("runId", "status");

-- AddForeignKey
ALTER TABLE "Credential" ADD CONSTRAINT "Credential_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySelection" ADD CONSTRAINT "EntitySelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntitySelection" ADD CONSTRAINT "EntitySelection_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "Migration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSelection" ADD CONSTRAINT "FieldSelection_entitySelectionId_fkey" FOREIGN KEY ("entitySelectionId") REFERENCES "EntitySelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldSelection" ADD CONSTRAINT "FieldSelection_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Migration" ADD CONSTRAINT "Migration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationRun" ADD CONSTRAINT "MigrationRun_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "Migration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MigrationLog" ADD CONSTRAINT "MigrationLog_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMapping" ADD CONSTRAINT "FieldMapping_migrationId_fkey" FOREIGN KEY ("migrationId") REFERENCES "Migration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMapping" ADD CONSTRAINT "FieldMapping_sourceFieldId_fkey" FOREIGN KEY ("sourceFieldId") REFERENCES "FieldSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FieldMapping" ADD CONSTRAINT "FieldMapping_targetFieldId_fkey" FOREIGN KEY ("targetFieldId") REFERENCES "FieldSelection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookNotification" ADD CONSTRAINT "WebhookNotification_runId_fkey" FOREIGN KEY ("runId") REFERENCES "MigrationRun"("id") ON DELETE CASCADE ON UPDATE CASCADE;

