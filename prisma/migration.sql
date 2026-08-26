-- 1. ENUM'lar önce
DO $$ BEGIN
  CREATE TYPE "Platform" AS ENUM ('DISCORD', 'GAME');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "EvidenceType" AS ENUM ('MESSAGE_URL', 'IMAGE', 'VIDEO', 'GIF', 'FILE', 'TEXT', 'EXTERNAL_URL');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- PunishmentType'e yeni değerler
DO $$ BEGIN ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'UNTIMEOUT'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'PURGE'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'LOCK'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'UNLOCK'; EXCEPTION WHEN duplicate_object THEN null; END $$;
DO $$ BEGIN ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'SLOWMODE'; EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Case tablosu
CREATE TABLE IF NOT EXISTS "cases" (
  "id" TEXT NOT NULL,
  "caseNumber" INTEGER NOT NULL,
  "guildId" TEXT NOT NULL,
  "targetId" TEXT,
  "targetChannelId" TEXT,
  "moderatorId" TEXT NOT NULL,
  "platform" "Platform" NOT NULL DEFAULT 'DISCORD',
  "type" "PunishmentType" NOT NULL,
  "reason" TEXT NOT NULL,
  "reasonCode" TEXT,
  "duration" INTEGER,
  "durationText" TEXT,
  "active" BOOLEAN NOT NULL DEFAULT true,
  "revoked" BOOLEAN NOT NULL DEFAULT false,
  "revokedBy" TEXT,
  "revokedReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "cases_guildId_caseNumber_key" ON "cases"("guildId", "caseNumber");
CREATE INDEX IF NOT EXISTS "cases_guildId_targetId_idx" ON "cases"("guildId", "targetId");
CREATE INDEX IF NOT EXISTS "cases_guildId_targetChannelId_idx" ON "cases"("guildId", "targetChannelId");
CREATE INDEX IF NOT EXISTS "cases_guildId_moderatorId_idx" ON "cases"("guildId", "moderatorId");
CREATE INDEX IF NOT EXISTS "cases_active_idx" ON "cases"("active");

-- 3. Evidence tablosu
CREATE TABLE IF NOT EXISTS "evidence" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "type" "EvidenceType" NOT NULL,
  "url" TEXT,
  "content" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "evidence_caseId_idx" ON "evidence"("caseId");

-- 4. Reason tablosu
CREATE TABLE IF NOT EXISTS "reasons" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "label" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT,
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "usageCount" INTEGER NOT NULL DEFAULT 0,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reasons_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "reasons_guildId_code_key" ON "reasons"("guildId", "code");

-- 5. Appeal tablosu
CREATE TABLE IF NOT EXISTS "appeals" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "status" "AppealStatus" NOT NULL DEFAULT 'PENDING',
  "reason" TEXT NOT NULL,
  "response" TEXT,
  "reviewedBy" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "appeals_caseId_idx" ON "appeals"("caseId");
CREATE INDEX IF NOT EXISTS "appeals_userId_idx" ON "appeals"("userId");
CREATE INDEX IF NOT EXISTS "appeals_status_idx" ON "appeals"("status");

-- 6. ModerationLog tablosu
CREATE TABLE IF NOT EXISTS "moderation_logs" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "targetId" TEXT,
  "action" TEXT NOT NULL,
  "details" JSONB,
  "caseNumber" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_logs_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "moderation_logs_guildId_createdAt_idx" ON "moderation_logs"("guildId", "createdAt");
CREATE INDEX IF NOT EXISTS "moderation_logs_moderatorId_idx" ON "moderation_logs"("moderatorId");

-- 7. Guild tablosuna caseCount
ALTER TABLE "guilds" ADD COLUMN IF NOT EXISTS "caseCount" INTEGER NOT NULL DEFAULT 0;

-- 8. Foreign key'ler
ALTER TABLE "cases" ADD CONSTRAINT "cases_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "cases" ADD CONSTRAINT "cases_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reasons" ADD CONSTRAINT "reasons_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "appeals" ADD CONSTRAINT "appeals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
