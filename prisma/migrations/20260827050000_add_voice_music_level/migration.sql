-- CreateTable
CREATE TABLE "voice_channel_configs" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "triggerChannelId" TEXT,
    "categoryChannelId" TEXT,
    "channelPrefix" TEXT NOT NULL DEFAULT 'ODA',
    "maxUsers" INTEGER NOT NULL DEFAULT 10,
    "autoDelete" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "voice_channel_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "temp_voice_channels" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "channelId" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "channelName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "temp_voice_channels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "level_configs" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "xpPerMessage" INTEGER NOT NULL DEFAULT 15,
    "xpCooldown" INTEGER NOT NULL DEFAULT 60,
    "levelUpChannelId" TEXT,
    "levelUpMessage" TEXT NOT NULL DEFAULT 'Tebrikler {user}, **Level {level}** oldun!',
    "roleRewards" JSONB NOT NULL DEFAULT '[]',
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "level_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_levels" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "xp" INTEGER NOT NULL DEFAULT 0,
    "level" INTEGER NOT NULL DEFAULT 1,
    "totalXp" INTEGER NOT NULL DEFAULT 0,
    "messages" INTEGER NOT NULL DEFAULT 0,
    "lastXpAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_levels_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_configs" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "djRoleId" TEXT,
    "volume" INTEGER NOT NULL DEFAULT 80,
    "autoLeave" BOOLEAN NOT NULL DEFAULT true,
    "autoLeaveTimer" INTEGER NOT NULL DEFAULT 300,
    "announceSongs" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "music_configs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "music_queue" (
    "id" TEXT NOT NULL,
    "guildId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "duration" TEXT,
    "requestedBy" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "music_queue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "voice_channel_configs_guildId_key" ON "voice_channel_configs"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "temp_voice_channels_channelId_key" ON "temp_voice_channels"("channelId");

-- CreateIndex
CREATE INDEX "temp_voice_channels_guildId_idx" ON "temp_voice_channels"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "level_configs_guildId_key" ON "level_configs"("guildId");

-- CreateIndex
CREATE UNIQUE INDEX "user_levels_guildId_userId_key" ON "user_levels"("guildId", "userId");

-- CreateIndex
CREATE INDEX "user_levels_guildId_level_idx" ON "user_levels"("guildId", "level");

-- CreateIndex
CREATE UNIQUE INDEX "music_configs_guildId_key" ON "music_configs"("guildId");

-- CreateIndex
CREATE INDEX "music_queue_guildId_position_idx" ON "music_queue"("guildId", "position");

-- AddForeignKey
ALTER TABLE "voice_channel_configs" ADD CONSTRAINT "voice_channel_configs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_voice_channels" ADD CONSTRAINT "temp_voice_channels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "temp_voice_channels" ADD CONSTRAINT "temp_voice_channels_guildId_config_fkey" FOREIGN KEY ("guildId") REFERENCES "voice_channel_configs"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "level_configs" ADD CONSTRAINT "level_configs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_levels" ADD CONSTRAINT "user_levels_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_configs" ADD CONSTRAINT "music_configs_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "music_queue" ADD CONSTRAINT "music_queue_guildId_fkey" FOREIGN KEY ("guildId") REFERENCES "guilds"("guildId") ON DELETE CASCADE ON UPDATE CASCADE;
