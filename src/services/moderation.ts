import { getPrisma } from './database/index.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('MODERATION');

export type ModerationAction =
  | 'ban'
  | 'kick'
  | 'unban'
  | 'timeout'
  | 'untimeout'
  | 'warn'
  | 'mute'
  | 'unmute'
  | 'jail'
  | 'unjail';

export interface ModerationResult {
  success: boolean;
  caseNumber?: number;
  error?: string;
}

export async function getNextCaseNumber(guildId: string): Promise<number> {
  const prisma = getPrisma();

  const lastCase = await prisma.moderationCase.findFirst({
    where: { guildId },
    orderBy: { caseNumber: 'desc' },
    select: { caseNumber: true },
  });

  return (lastCase?.caseNumber ?? 0) + 1;
}

export async function createModerationCase(
  guildId: string,
  action: ModerationAction,
  moderatorId: string,
  targetId: string,
  reason: string,
  duration?: number,
): Promise<ModerationResult> {
  const prisma = getPrisma();

  try {
    const caseNumber = await getNextCaseNumber(guildId);

    await prisma.moderationCase.create({
      data: {
        guildId,
        caseNumber,
        action,
        moderatorId,
        targetId,
        reason,
        duration,
      },
    });

    log.info(
      'Case #%d created in guild %s: %s on %s by %s',
      caseNumber,
      guildId,
      action,
      targetId,
      moderatorId,
    );

    return { success: true, caseNumber };
  } catch (error) {
    log.error(
      'Failed to create moderation case in guild %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return { success: false, error: 'Veritabanına kayıt oluşturulamadı.' };
  }
}

export async function getCaseCount(guildId: string): Promise<number> {
  const prisma = getPrisma();

  try {
    const count = await prisma.moderationCase.count({
      where: { guildId },
    });
    return count;
  } catch (error) {
    log.error(
      'Failed to get case count for guild %s: %s',
      guildId,
      error instanceof Error ? error.message : String(error),
    );
    return 0;
  }
}
