-- Setup & Module Engine Migration

-- 1. Modules tablosu
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
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "modules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "modules_guildId_name_key" UNIQUE ("guildId", "name")
);

-- 2. SetupHistory tablosu
CREATE TABLE IF NOT EXISTS "setup_history" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "profile" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "itemsCreated" JSONB,
  "itemsSkipped" JSONB,
  "errors" JSONB,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completedAt" TIMESTAMP(3),
  CONSTRAINT "setup_history_pkey" PRIMARY KEY ("id")
);

-- 3. HealthChecks tablosu
CREATE TABLE IF NOT EXISTS "health_checks" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'OK',
  "issues" JSONB NOT NULL DEFAULT '[]',
  "warnings" JSONB NOT NULL DEFAULT '[]',
  "checkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);

-- 4. ConfigBackups tablosu
CREATE TABLE IF NOT EXISTS "config_backups" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "data" JSONB NOT NULL,
  "createdBy" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "config_backups_pkey" PRIMARY KEY ("id")
);

-- 5. GuildChannels tablosu (sunucu kanallarını takip için)
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
  CONSTRAINT "guild_channels_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guild_channels_guildId_channelId_key" UNIQUE ("guildId", "channelId")
);

-- 6. GuildRoles tablosu
CREATE TABLE IF NOT EXISTS "guild_roles" (
  "id" TEXT NOT NULL,
  "guildId" TEXT NOT NULL,
  "roleId" TEXT NOT NULL,
  "roleName" TEXT NOT NULL,
  "roleColor" TEXT,
  "rolePosition" INTEGER,
  "permissions" JSONB,
  "autoCreated" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "guild_roles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "guild_roles_guildId_roleId_key" UNIQUE ("guildId", "roleId")
);

-- Foreign keys
ALTER TABLE "modules" ADD CONSTRAINT "modules_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "setup_history" ADD CONSTRAINT "setup_history_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "health_checks" ADD CONSTRAINT "health_checks_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "config_backups" ADD CONSTRAINT "config_backups_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_channels" ADD CONSTRAINT "guild_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "guild_roles" ADD CONSTRAINT "guild_roles_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
