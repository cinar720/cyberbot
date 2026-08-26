-- CyberBOT v1.0.0 - Full Schema Migration
-- This migration creates all missing tables and enums

-- Create missing enums (with IF NOT EXISTS handling)
DO $$ BEGIN
    CREATE TYPE "Platform" AS ENUM ('DISCORD', 'GAME');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "EvidenceType" AS ENUM ('MESSAGE_URL', 'IMAGE', 'VIDEO', 'TEXT', 'EXTERNAL_URL', 'FILE', 'SCREENSHOT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "AppealStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "TicketStatus" AS ENUM ('OPEN', 'CLOSED', 'PENDING');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "MatchType" AS ENUM ('EXACT', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'REGEX');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Update PunishmentType enum if missing values
DO $$ BEGIN
    ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'UNTIMEOUT';
    ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'PURGE';
    ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'LOCK';
    ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'UNLOCK';
    ALTER TYPE "PunishmentType" ADD VALUE IF NOT EXISTS 'SLOWMODE';
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Create cases table (if not exists from init migration)
CREATE TABLE IF NOT EXISTS "cases" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "caseNumber" INTEGER NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "targetId" TEXT,
    "targetChannelId" TEXT,
    "platform" "Platform" NOT NULL DEFAULT 'DISCORD',
    "type" "PunishmentType" NOT NULL,
    "reason" TEXT NOT NULL,
    "reasonCode" TEXT,
    "duration" INTEGER,
    "durationText" TEXT,
    "metadata" JSONB,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "revokedBy" TEXT,
    "revokedReason" TEXT,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cases_pkey" PRIMARY KEY ("id")
);

-- Create unique constraint for case numbers per guild
CREATE UNIQUE INDEX IF NOT EXISTS "cases_guildId_caseNumber_key" ON "cases"("guildId", "caseNumber");
CREATE INDEX IF NOT EXISTS "cases_guildId_idx" ON "cases"("guildId");
CREATE INDEX IF NOT EXISTS "cases_targetId_idx" ON "cases"("targetId");
CREATE INDEX IF NOT EXISTS "cases_moderatorId_idx" ON "cases"("moderatorId");
CREATE INDEX IF NOT EXISTS "cases_targetChannelId_idx" ON "cases"("targetChannelId");

-- Create evidence table
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

-- Create reasons table
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "reasons_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "reasons_guildId_code_key" ON "reasons"("guildId", "code");

-- Create appeals table
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
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appeals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "appeals_caseId_idx" ON "appeals"("caseId");
CREATE INDEX IF NOT EXISTS "appeals_userId_idx" ON "appeals"("userId");
CREATE INDEX IF NOT EXISTS "appeals_status_idx" ON "appeals"("status");

-- Create moderation_logs table
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

-- Create guild_policies table
CREATE TABLE IF NOT EXISTS "guild_policies" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "maxWarnings" INTEGER NOT NULL DEFAULT 3,
    "maxTimeoutMinutes" INTEGER NOT NULL DEFAULT 40320,
    "banPolicy" TEXT NOT NULL DEFAULT 'STANDARD',
    "appealEnabled" BOOLEAN NOT NULL DEFAULT true,
    "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
    "dmEnabled" BOOLEAN NOT NULL DEFAULT true,
    "gamePunishmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
    "dryRunMode" BOOLEAN NOT NULL DEFAULT false,
    "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 5,
    "sameTargetCooldownMinutes" INTEGER NOT NULL DEFAULT 30,
    "autoDeleteEvidence" BOOLEAN NOT NULL DEFAULT false,
    "notifyOnAppeal" BOOLEAN NOT NULL DEFAULT true,
    "requireReason" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_policies_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "guild_policies_guildId_key" ON "guild_policies"("guildId");

-- Create escalation_chains table
CREATE TABLE IF NOT EXISTS "escalation_chains" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "steps" JSONB NOT NULL,
    "resetAfterDays" INTEGER NOT NULL DEFAULT 30,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "escalation_chains_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "escalation_chains_guildId_idx" ON "escalation_chains"("guildId");

-- Create violation_rules table
CREATE TABLE IF NOT EXISTS "violation_rules" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "punishmentType" "PunishmentType" NOT NULL,
    "duration" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 1,
    "autoReport" BOOLEAN NOT NULL DEFAULT false,
    "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
    "maxOccurrences" INTEGER NOT NULL DEFAULT 5,
    "escalationChainId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "violation_rules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "violation_rules_guildId_code_key" ON "violation_rules"("guildId", "code");
CREATE INDEX IF NOT EXISTS "violation_rules_guildId_idx" ON "violation_rules"("guildId");

-- Create permission_profiles table
CREATE TABLE IF NOT EXISTS "permission_profiles" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB NOT NULL,
    "maxBanDuration" INTEGER,
    "maxMuteDuration" INTEGER,
    "canBan" BOOLEAN NOT NULL DEFAULT false,
    "canKick" BOOLEAN NOT NULL DEFAULT false,
    "canMute" BOOLEAN NOT NULL DEFAULT false,
    "canWarn" BOOLEAN NOT NULL DEFAULT false,
    "canJail" BOOLEAN NOT NULL DEFAULT false,
    "canUnban" BOOLEAN NOT NULL DEFAULT false,
    "canViewCases" BOOLEAN NOT NULL DEFAULT false,
    "canManageAppeals" BOOLEAN NOT NULL DEFAULT false,
    "canManagePolicies" BOOLEAN NOT NULL DEFAULT false,
    "canViewAuditLog" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "permission_profiles_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "permission_profiles_guildId_idx" ON "permission_profiles"("guildId");

-- Create case_timeline table
CREATE TABLE IF NOT EXISTS "case_timeline" (
    "id" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_timeline_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "case_timeline_caseId_idx" ON "case_timeline"("caseId");

-- Create policy_cooldowns table
CREATE TABLE IF NOT EXISTS "policy_cooldowns" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "policy_cooldowns_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "policy_cooldowns_guildId_userId_action_idx" ON "policy_cooldowns"("guildId", "userId", "action");

-- Create moderation_lists table
CREATE TABLE IF NOT EXISTS "moderation_lists" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "reason" TEXT,
    "addedBy" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moderation_lists_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "moderation_lists_guildId_userId_type_idx" ON "moderation_lists"("guildId", "userId", "type");

-- Create user_violation_counts table
CREATE TABLE IF NOT EXISTS "user_violation_counts" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ruleCode" TEXT NOT NULL,
    "count" INTEGER NOT NULL DEFAULT 0,
    "lastOccurrence" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_violation_counts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "user_violation_counts_guildId_userId_ruleCode_idx" ON "user_violation_counts"("guildId", "userId", "ruleCode");

-- Create dry_run_logs table
CREATE TABLE IF NOT EXISTS "dry_run_logs" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moderatorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "duration" INTEGER,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dry_run_logs_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "dry_run_logs_guildId_idx" ON "dry_run_logs"("guildId");

-- Create modules table
CREATE TABLE IF NOT EXISTS "modules" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "configured" BOOLEAN NOT NULL DEFAULT false,
    "version" TEXT NOT NULL DEFAULT '1.0.0',
    "lastUpdated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "config" JSONB,
    "enabledBy" TEXT,
    "disabledBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "modules_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "modules_guildId_name_key" ON "modules"("guildId", "name");

-- Create setup_history table
CREATE TABLE IF NOT EXISTS "setup_history" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "itemsCreated" JSONB,
    "itemsSkipped" JSONB,
    "errors" JSONB,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "setup_history_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "setup_history_guildId_idx" ON "setup_history"("guildId");

-- Create health_checks table
CREATE TABLE IF NOT EXISTS "health_checks" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issues" JSONB,
    "warnings" JSONB,
    "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "health_checks_guildId_idx" ON "health_checks"("guildId");

-- Create config_backups table
CREATE TABLE IF NOT EXISTS "config_backups" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "config_backups_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "config_backups_guildId_idx" ON "config_backups"("guildId");

-- Create guild_channels table
CREATE TABLE IF NOT EXISTS "guild_channels" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "channelType" TEXT NOT NULL,
    "category" TEXT,
    "purpose" TEXT,
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_channels_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "guild_channels_guildId_channelId_key" ON "guild_channels"("guildId", "channelId");

-- Create guild_roles table
CREATE TABLE IF NOT EXISTS "guild_roles" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "roleName" TEXT NOT NULL,
    "roleColor" TEXT,
    "rolePosition" INTEGER NOT NULL DEFAULT 0,
    "permissions" JSONB,
    "autoCreated" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "guild_roles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "guild_roles_guildId_roleId_key" ON "guild_roles"("guildId", "roleId");

-- Add foreign key constraints for cases table
DO $$ BEGIN
    ALTER TABLE "cases" ADD CONSTRAINT "cases_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cases" ADD CONSTRAINT "cases_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "users"("userId") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "cases" ADD CONSTRAINT "cases_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Add foreign key constraints for other tables
DO $$ BEGIN
    ALTER TABLE "evidence" ADD CONSTRAINT "evidence_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "reasons" ADD CONSTRAINT "reasons_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appeals" ADD CONSTRAINT "appeals_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "appeals" ADD CONSTRAINT "appeals_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "moderation_logs" ADD CONSTRAINT "moderation_logs_moderatorId_fkey" FOREIGN KEY ("moderatorId") REFERENCES "users"("userId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "guild_policies" ADD CONSTRAINT "guild_policies_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "escalation_chains" ADD CONSTRAINT "escalation_chains_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "violation_rules" ADD CONSTRAINT "violation_rules_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "permission_profiles" ADD CONSTRAINT "permission_profiles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "case_timeline" ADD CONSTRAINT "case_timeline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "modules" ADD CONSTRAINT "modules_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "setup_history" ADD CONSTRAINT "setup_history_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "config_backups" ADD CONSTRAINT "config_backups_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "guild_channels" ADD CONSTRAINT "guild_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    ALTER TABLE "guild_roles" ADD CONSTRAINT "guild_roles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
