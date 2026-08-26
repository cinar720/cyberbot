-- Policy Engine Migration

-- 1. GuildPolicy tablosu (her sunucu kendi politikasını belirler)
CREATE TABLE IF NOT EXISTS "guild_policies" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "maxWarnings" INTEGER NOT NULL DEFAULT 3,
  "maxTimeoutMinutes" INTEGER NOT NULL DEFAULT 40320,
  "banPolicy" TEXT NOT NULL DEFAULT 'STRIKE_3',
  "appealEnabled" BOOLEAN NOT NULL DEFAULT true,
  "evidenceRequired" BOOLEAN NOT NULL DEFAULT false,
  "dmEnabled" BOOLEAN NOT NULL DEFAULT true,
  "gamePunishmentsEnabled" BOOLEAN NOT NULL DEFAULT false,
  "dryRunMode" BOOLEAN NOT NULL DEFAULT false,
  "escalationEnabled" BOOLEAN NOT NULL DEFAULT true,
  "cooldownMinutes" INTEGER NOT NULL DEFAULT 5,
  "sameTargetCooldownMinutes" INTEGER NOT NULL DEFAULT 1,
  "autoDeleteEvidence" BOOLEAN NOT NULL DEFAULT false,
  "notifyOnAppeal" BOOLEAN NOT NULL DEFAULT true,
  "requireReason" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guild_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guild_policies_guildId_key" UNIQUE ("guildId")
);

-- 2. EscalationChain tablosu (otomatik ceza yükseltme)
CREATE TABLE IF NOT EXISTS "escalation_chains" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "name" TEXT NOT NULL DEFAULT 'DEFAULT',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "steps" JSONB NOT NULL DEFAULT '[
    {"step": 1, "action": "WARN", "reason": "İlk uyarı"},
    {"step": 2, "action": "WARN", "reason": "İkinci uyarı"},
    {"step": 3, "action": "TIMEOUT", "duration": "1h", "reason": "Üçüncü uyarı - zaman aşımı"},
    {"step": 4, "action": "MUTE", "duration": "1d", "reason": "Dördüncü ihlal - susturma"},
    {"step": 5, "action": "KICK", "reason": "Beşinci ihlal - atılma"},
    {"step": 6, "action": "BAN", "reason": "Altıncı ihlal - yasaklama"}
  ]',
  "resetAfterDays" INTEGER NOT NULL DEFAULT 30,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "escalation_chains_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "escalation_chains_guildId_name_key" UNIQUE ("guildId", "name")
);

-- 3. ViolationRules tablosu (ihlal kuralları)
CREATE TABLE IF NOT EXISTS "violation_rules" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "category" TEXT NOT NULL DEFAULT 'GENEL',
  "enabled" BOOLEAN NOT NULL DEFAULT true,
  "punishmentType" TEXT NOT NULL DEFAULT 'WARN',
  "duration" TEXT,
  "points" INTEGER NOT NULL DEFAULT 1,
  "autoReport" BOOLEAN NOT NULL DEFAULT false,
  "cooldownMinutes" INTEGER NOT NULL DEFAULT 0,
  "maxOccurrences" INTEGER,
  "escalationChainId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "violation_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "violation_rules_guildId_code_key" UNIQUE ("guildId", "code")
);

-- 4. PermissionProfiles tablosu
CREATE TABLE IF NOT EXISTS "permission_profiles" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "level" INTEGER NOT NULL DEFAULT 0,
  "permissions" JSONB NOT NULL DEFAULT '[]',
  "maxBanDuration" INTEGER,
  "maxMuteDuration" INTEGER,
  "canBan" BOOLEAN NOT NULL DEFAULT false,
  "canKick" BOOLEAN NOT NULL DEFAULT false,
  "canMute" BOOLEAN NOT NULL DEFAULT false,
  "canWarn" BOOLEAN NOT NULL DEFAULT false,
  "canJail" BOOLEAN NOT NULL DEFAULT false,
  "canUnban" BOOLEAN NOT NULL DEFAULT false,
  "canViewCases" BOOLEAN NOT NULL DEFAULT true,
  "canManageAppeals" BOOLEAN NOT NULL DEFAULT false,
  "canManagePolicies" BOOLEAN NOT NULL DEFAULT false,
  "canViewAuditLog" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "permission_profiles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "permission_profiles_guildId_name_key" UNIQUE ("guildId", "name")
);

-- 5. CaseTimeline tablosu (her case için zaman çizelgesi)
CREATE TABLE IF NOT EXISTS "case_timeline" (
  "id" TEXT NOT NULL,
  "caseId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "actorId" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "case_timeline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "case_timeline_caseId_idx" ON "case_timeline"("caseId");

-- 6. Cooldown tablosu (policy cooldown)
CREATE TABLE IF NOT EXISTS "policy_cooldowns" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "policy_cooldowns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "policy_cooldowns_guildId_userId_action_key" UNIQUE ("guildId", "userId", "action")
);

-- 7. Whitelist/Blacklist tablosu
CREATE TABLE IF NOT EXISTS "moderation_lists" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "reason" TEXT,
  "addedBy" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "moderation_lists_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "moderation_lists_guildId_userId_type_key" UNIQUE ("guildId", "userId", "type")
);

-- 8. UserViolationCount tablosu (tekrarlayan ihlaller için)
CREATE TABLE IF NOT EXISTS "user_violation_counts" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "ruleCode" TEXT NOT NULL,
  "count" INTEGER NOT NULL DEFAULT 1,
  "lastOccurrence" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_violation_counts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "user_violation_counts_guildId_userId_ruleCode_key" UNIQUE ("guildId", "userId", "ruleCode")
);

-- 9. DryRunLogs tablosu
CREATE TABLE IF NOT EXISTS "dry_run_logs" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "moderatorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "duration" TEXT,
  "details" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "dry_run_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "guild_policies" ADD CONSTRAINT "guild_policies_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "escalation_chains" ADD CONSTRAINT "escalation_chains_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "violation_rules" ADD CONSTRAINT "violation_rules_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "permission_profiles" ADD CONSTRAINT "permission_profiles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "case_timeline" ADD CONSTRAINT "case_timeline_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "cases"("id") ON DELETE CASCADE ON UPDATE CASCADE;
