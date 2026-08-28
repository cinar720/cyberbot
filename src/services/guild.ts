import { getPrisma } from './database/index.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('GUILD-SERVICE');

export interface GuildData {
  guildId: string;
  name: string;
  memberCount: number;
  ownerId?: string;
}

export async function upsertGuild(data: GuildData): Promise<void> {
  const prisma = getPrisma();

  try {
    await prisma.guild.upsert({
      where: { guildId: data.guildId },
      update: {
        name: data.name,
        memberCount: data.memberCount,
        owner_id: data.ownerId ?? undefined,
        leftAt: null,
      },
      create: {
        guildId: data.guildId,
        name: data.name,
        memberCount: data.memberCount,
        owner_id: data.ownerId,
      },
    });
    log.debug('Guild upserted: %s (%s)', data.name, data.guildId);
  } catch (error) {
    log.error(
      'Failed to upsert guild %s: %s',
      data.guildId,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function markGuildLeft(guildId: string): Promise<void> {
  const prisma = getPrisma();

  try {
    await prisma.guild.updateMany({
      where: { guildId, leftAt: null },
      data: { leftAt: new Date() },
    });
    log.debug('Guild marked as left: %s', guildId);
  } catch (error) {
    log.error(
      'Failed to mark guild left %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function getGuildCount(): Promise<number> {
  const prisma = getPrisma();

  try {
    return await prisma.guild.count({ where: { leftAt: null } });
  } catch (error) {
    log.error(
      'Failed to get guild count: %s',
      error instanceof Error ? error.message : String(error),
    );
    return 0;
  }
}
