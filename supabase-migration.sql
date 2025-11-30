-- Beton Trolley Database Migration for Supabase
-- Run this in Supabase SQL Editor after creating your project

-- Create ENUM types
CREATE TYPE "CredentialType" AS ENUM (
  'TWENTY_BASE_URL',
  'TWENTY_API_TOKEN',
  'TOOL_TOKEN',
  'ATTIO_API_TOKEN',
  'NOTIFICATION_WEBHOOK'
);

CREATE TYPE "CredentialStatus" AS ENUM (
  'PENDING',
  'VALID',
  'INVALID',
  'ERROR'
);

CREATE TYPE "CrmSystem" AS ENUM (
  'TWENTY',
  'ATTIO',
  'INTERNAL'
);

CREATE TYPE "SelectionStatus" AS ENUM (
  'PENDING',
  'FETCHING',
  'READY',
  'ERROR'
);

CREATE TYPE "MigrationStatus" AS ENUM (
  'DRAFT',
  'COLLECTING',
  'VALIDATING',
  'READY',
  'RUNNING',
  'COMPLETED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "RunStatus" AS ENUM (
  'QUEUED',
  'RUNNING',
  'SUCCEEDED',
  'FAILED',
  'CANCELLED'
);

CREATE TYPE "LogLevel" AS ENUM (
  'DEBUG',
  'INFO',
  'WARN',
  'ERROR'
);

CREATE TYPE "WebhookStatus" AS ENUM (
  'PENDING',
  'RETRYING',
  'DELIVERED',
  'FAILED'
);

CREATE TYPE "WebhookEvent" AS ENUM (
  'MIGRATION_COMPLETED',
  'MIGRATION_FAILED',
  'RUN_PROGRESS'
);

-- Create tables
-- Note: Supabase automatically creates auth.users table for authentication
-- We'll extend it with our User table that references auth.users

CREATE TABLE "User" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email" TEXT UNIQUE,
  "displayName" TEXT,
  "organization" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create trigger to update updatedAt
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "User"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "Credential" (
  "id" TEXT PRIMARY KEY DEFAULT ('cred_' || gen_random_uuid()::text),
  "userId" UUID REFERENCES "User"("id") ON DELETE SET NULL,
  "type" "CredentialType" NOT NULL,
  "label" TEXT,
  "secret" TEXT NOT NULL,
  "status" "CredentialStatus" DEFAULT 'PENDING',
  "lastValidatedAt" TIMESTAMP WITH TIME ZONE,
  "validationMessage" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "unique_credential_per_user_type" UNIQUE ("userId", "type")
);

CREATE INDEX "idx_credentials_user_type" ON "Credential"("userId", "type");
CREATE TRIGGER update_credential_updated_at BEFORE UPDATE ON "Credential"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "Migration" (
  "id" TEXT PRIMARY KEY DEFAULT ('mig_' || gen_random_uuid()::text),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "status" "MigrationStatus" DEFAULT 'DRAFT',
  "sourceSystem" "CrmSystem" DEFAULT 'TWENTY',
  "targetSystem" "CrmSystem" DEFAULT 'ATTIO',
  "config" JSONB,
  "recordEstimate" INTEGER,
  "etaSeconds" INTEGER,
  "lastRunAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "unique_migration_name_per_user" UNIQUE ("userId", "name")
);

CREATE INDEX "idx_migration_user_status" ON "Migration"("userId", "status");
CREATE TRIGGER update_migration_updated_at BEFORE UPDATE ON "Migration"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "EntitySelection" (
  "id" TEXT PRIMARY KEY DEFAULT ('ent_' || gen_random_uuid()::text),
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "migrationId" TEXT REFERENCES "Migration"("id") ON DELETE CASCADE,
  "system" "CrmSystem" NOT NULL,
  "entityName" TEXT NOT NULL,
  "entityLabel" TEXT,
  "status" "SelectionStatus" DEFAULT 'PENDING',
  "includeInSync" BOOLEAN DEFAULT false,
  "availableFieldCount" INTEGER,
  "sampleRecord" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "unique_entity_per_user_system" UNIQUE ("userId", "system", "entityName")
);

CREATE INDEX "idx_entity_selection_migration_system" ON "EntitySelection"("migrationId", "system");
CREATE TRIGGER update_entity_selection_updated_at BEFORE UPDATE ON "EntitySelection"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "FieldSelection" (
  "id" TEXT PRIMARY KEY DEFAULT ('fld_' || gen_random_uuid()::text),
  "entitySelectionId" TEXT NOT NULL REFERENCES "EntitySelection"("id") ON DELETE CASCADE,
  "userId" UUID NOT NULL REFERENCES "User"("id") ON DELETE CASCADE,
  "fieldName" TEXT NOT NULL,
  "fieldLabel" TEXT,
  "fieldType" TEXT,
  "isRequired" BOOLEAN DEFAULT false,
  "isSelected" BOOLEAN DEFAULT false,
  "sampleValue" JSONB,
  "metadata" JSONB,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "entity_field_unique" UNIQUE ("entitySelectionId", "fieldName")
);

CREATE INDEX "idx_field_selection_entity_field" ON "FieldSelection"("entitySelectionId", "fieldName");
CREATE TRIGGER update_field_selection_updated_at BEFORE UPDATE ON "FieldSelection"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "MigrationRun" (
  "id" TEXT PRIMARY KEY DEFAULT ('run_' || gen_random_uuid()::text),
  "migrationId" TEXT NOT NULL REFERENCES "Migration"("id") ON DELETE CASCADE,
  "status" "RunStatus" DEFAULT 'QUEUED',
  "progress" DOUBLE PRECISION,
  "etaSeconds" INTEGER,
  "recordsProcessed" INTEGER,
  "batchesProcessed" INTEGER,
  "rateLimitHitCount" INTEGER,
  "errorMessage" TEXT,
  "startedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "completedAt" TIMESTAMP WITH TIME ZONE,
  "metrics" JSONB
);

CREATE INDEX "idx_run_migration_status" ON "MigrationRun"("migrationId", "status");

CREATE TABLE "MigrationLog" (
  "id" TEXT PRIMARY KEY DEFAULT ('log_' || gen_random_uuid()::text),
  "runId" TEXT NOT NULL REFERENCES "MigrationRun"("id") ON DELETE CASCADE,
  "level" "LogLevel" DEFAULT 'INFO',
  "message" TEXT NOT NULL,
  "context" JSONB,
  "entityReference" TEXT,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX "idx_log_run_level" ON "MigrationLog"("runId", "level");

CREATE TABLE "FieldMapping" (
  "id" TEXT PRIMARY KEY DEFAULT ('map_' || gen_random_uuid()::text),
  "migrationId" TEXT NOT NULL REFERENCES "Migration"("id") ON DELETE CASCADE,
  "sourceFieldId" TEXT NOT NULL REFERENCES "FieldSelection"("id") ON DELETE CASCADE,
  "targetFieldId" TEXT NOT NULL REFERENCES "FieldSelection"("id") ON DELETE CASCADE,
  "transformation" JSONB,
  "isActive" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  CONSTRAINT "unique_field_mapping_triplet" UNIQUE ("migrationId", "sourceFieldId", "targetFieldId")
);

CREATE TRIGGER update_field_mapping_updated_at BEFORE UPDATE ON "FieldMapping"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE "WebhookNotification" (
  "id" TEXT PRIMARY KEY DEFAULT ('hook_' || gen_random_uuid()::text),
  "runId" TEXT NOT NULL REFERENCES "MigrationRun"("id") ON DELETE CASCADE,
  "event" "WebhookEvent" NOT NULL,
  "status" "WebhookStatus" DEFAULT 'PENDING',
  "targetUrl" TEXT NOT NULL,
  "payload" JSONB,
  "responseStatusCode" INTEGER,
  "responseBody" TEXT,
  "attemptCount" INTEGER DEFAULT 0,
  "lastAttemptAt" TIMESTAMP WITH TIME ZONE,
  "deliveredAt" TIMESTAMP WITH TIME ZONE,
  "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX "idx_webhook_run_status" ON "WebhookNotification"("runId", "status");
CREATE TRIGGER update_webhook_notification_updated_at BEFORE UPDATE ON "WebhookNotification"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS)
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Credential" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Migration" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EntitySelection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldSelection" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MigrationRun" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "MigrationLog" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "FieldMapping" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "WebhookNotification" ENABLE ROW LEVEL SECURITY;

-- Create RLS Policies
-- Users can only access their own data

-- User policies
CREATE POLICY "Users can view own profile" ON "User"
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON "User"
  FOR UPDATE USING (auth.uid() = id);

-- Credential policies
CREATE POLICY "Users can view own credentials" ON "Credential"
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own credentials" ON "Credential"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own credentials" ON "Credential"
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own credentials" ON "Credential"
  FOR DELETE USING (auth.uid() = "userId");

-- Migration policies
CREATE POLICY "Users can view own migrations" ON "Migration"
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own migrations" ON "Migration"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own migrations" ON "Migration"
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own migrations" ON "Migration"
  FOR DELETE USING (auth.uid() = "userId");

-- EntitySelection policies
CREATE POLICY "Users can view own entity selections" ON "EntitySelection"
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own entity selections" ON "EntitySelection"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own entity selections" ON "EntitySelection"
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own entity selections" ON "EntitySelection"
  FOR DELETE USING (auth.uid() = "userId");

-- FieldSelection policies
CREATE POLICY "Users can view own field selections" ON "FieldSelection"
  FOR SELECT USING (auth.uid() = "userId");

CREATE POLICY "Users can insert own field selections" ON "FieldSelection"
  FOR INSERT WITH CHECK (auth.uid() = "userId");

CREATE POLICY "Users can update own field selections" ON "FieldSelection"
  FOR UPDATE USING (auth.uid() = "userId");

CREATE POLICY "Users can delete own field selections" ON "FieldSelection"
  FOR DELETE USING (auth.uid() = "userId");

-- MigrationRun policies (users can view runs for their migrations)
CREATE POLICY "Users can view own migration runs" ON "MigrationRun"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Migration"
      WHERE "Migration"."id" = "MigrationRun"."migrationId"
      AND "Migration"."userId" = auth.uid()
    )
  );

-- MigrationLog policies (users can view logs for their migration runs)
CREATE POLICY "Users can view own migration logs" ON "MigrationLog"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "MigrationRun"
      JOIN "Migration" ON "Migration"."id" = "MigrationRun"."migrationId"
      WHERE "MigrationRun"."id" = "MigrationLog"."runId"
      AND "Migration"."userId" = auth.uid()
    )
  );

-- FieldMapping policies
CREATE POLICY "Users can view own field mappings" ON "FieldMapping"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "Migration"
      WHERE "Migration"."id" = "FieldMapping"."migrationId"
      AND "Migration"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can insert own field mappings" ON "FieldMapping"
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM "Migration"
      WHERE "Migration"."id" = "FieldMapping"."migrationId"
      AND "Migration"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can update own field mappings" ON "FieldMapping"
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM "Migration"
      WHERE "Migration"."id" = "FieldMapping"."migrationId"
      AND "Migration"."userId" = auth.uid()
    )
  );

CREATE POLICY "Users can delete own field mappings" ON "FieldMapping"
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM "Migration"
      WHERE "Migration"."id" = "FieldMapping"."migrationId"
      AND "Migration"."userId" = auth.uid()
    )
  );

-- WebhookNotification policies
CREATE POLICY "Users can view own webhook notifications" ON "WebhookNotification"
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM "MigrationRun"
      JOIN "Migration" ON "Migration"."id" = "MigrationRun"."migrationId"
      WHERE "MigrationRun"."id" = "WebhookNotification"."runId"
      AND "Migration"."userId" = auth.uid()
    )
  );

-- Create function to sync auth.users with User table
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public."User" (id, email, "displayName", "createdAt", "updatedAt")
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NOW(),
    NOW()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger on auth.users
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Beton Trolley database schema created successfully!';
  RAISE NOTICE 'Row Level Security (RLS) is enabled on all tables.';
  RAISE NOTICE 'Users can only access their own data.';
END $$;
