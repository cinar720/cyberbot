import { getPrisma } from './database/index.js';
import { createChildLogger } from '../utils/logger.js';
import { defaultGuildConfig, guildConfigSchema, type GuildConfigInput } from '../config/guild.js';

const log = createChildLogger('GUILD-CONFIG');

interface CacheEntry {
  config: GuildConfigInput;
  timestamp: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

function isValidCache(entry: CacheEntry): boolean {
  return Date.now() - entry.timestamp < CACHE_TTL;
}

export async function getGuildConfig(guildId: string): Promise<GuildConfigInput> {
  const cached = cache.get(guildId);
  if (cached && isValidCache(cached)) {
    return cached.config;
  }

  const prisma = getPrisma();

  try {
    const guild = await prisma.guild.findUnique({
      where: { guildId },
      select: {
        prefix: true,
        language: true,
        enabled: true,
        modEnabled: true,
        logChannelId: true,
        muteRoleId: true,
        jailRoleId: true,
      },
    });

    if (!guild) {
      log.warn('Guild not found in DB: %s, returning defaults.', guildId);
      return { ...defaultGuildConfig };
    }

    const config: GuildConfigInput = {
      prefix: guild.prefix,
      language: guild.language as 'tr' | 'en',
      enabled: guild.enabled,
      modEnabled: guild.modEnabled,
      logChannelId: guild.logChannelId,
      muteRoleId: guild.muteRoleId,
      jailRoleId: guild.jailRoleId,
    };

    cache.set(guildId, { config, timestamp: Date.now() });
    return config;
  } catch (error) {
    log.error(
      'Failed to get guild config %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return { ...defaultGuildConfig };
  }
}

export async function updateGuildConfig(
  guildId: string,
  input: Partial<GuildConfigInput>,
): Promise<{ success: boolean; error?: string }> {
  const parsed = guildConfigSchema.partial().safeParse(input);

  if (!parsed.success) {
    const errorMsg = parsed.error.flatten().fieldErrors;
    const msg = Object.entries(errorMsg)
      .map(([k, v]) => `${k}: ${v?.join(', ')}`)
      .join('; ');
    log.warn('Invalid config for guild %s: %s', guildId, msg);
    return { success: false, error: msg };
  }

  const prisma = getPrisma();

  try {
    const existing = await prisma.guild.findUnique({ where: { guildId } });
    if (!existing) {
      return { success: false, error: 'Guild bulunamadi.' };
    }

    await prisma.guild.update({
      where: { guildId },
      data: parsed.data,
    });

    cache.delete(guildId);
    log.info('Guild config updated: %s', guildId);
    return { success: true };
  } catch (error) {
    log.error(
      'Failed to update guild config %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: 'Veritabani hatasi.' };
  }
}

export async function resetGuildConfig(guildId: string): Promise<boolean> {
  return updateGuildConfig(guildId, defaultGuildConfig).then((r) => r.success);
}

export async function ensureGuildConfig(
  guildId: string,
  name: string,
  memberCount: number,
  ownerId?: string,
): Promise<void> {
  const prisma = getPrisma();

  try {
    const existing = await prisma.guild.findUnique({ where: { guildId } });

    if (existing) {
      await prisma.guild.update({
        where: { guildId },
        data: {
          name,
          memberCount,
          owner_id: ownerId ?? undefined,
          leftAt: null,
        },
      });
      cache.delete(guildId);
    } else {
      await prisma.guild.create({
        data: {
          guildId,
          name,
          memberCount,
          owner_id: ownerId,
          ...defaultGuildConfig,
        },
      });
      log.info('Guild created with default config: %s (%s)', name, guildId);
    }
  } catch (error) {
    log.error(
      'Failed to ensure guild config %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export function invalidateGuildCache(guildId: string): void {
  cache.delete(guildId);
}

export function clearConfigCache(): void {
  cache.clear();
}
