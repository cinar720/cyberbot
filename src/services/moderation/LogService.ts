import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('LOG');

export interface LogEntry {
  id: string;
  guildId: string;
  moderatorId: string;
  targetId: string | null;
  action: string;
  details: Prisma.JsonValue | null;
  caseNumber: number | null;
  createdAt: Date;
}

export interface LogFilterOptions {
  type?: string;
  moderatorId?: string;
  targetId?: string;
  limit?: number;
}

export class LogService {
  static async log(
    guildId: string,
    type: string,
    channelId: string,
    content: string,
    moderatorId?: string,
    targetId?: string,
  ): Promise<void> {
    const db = getPrisma();
    try {
      await db.moderationLog.create({
        data: {
          guildId,
          moderatorId: moderatorId ?? 'SYSTEM',
          targetId: targetId ?? null,
          action: type,
          details: {
            channelId,
            content,
          } as unknown as Prisma.InputJsonValue,
        },
      });
      log.info(`Log kaydedildi: ${type} (${guildId})`);
    } catch (error) {
      log.error('Log kaydetme hatası', error);
      throw error;
    }
  }

  static async getLogs(
    guildId: string,
    options?: LogFilterOptions,
  ): Promise<LogEntry[]> {
    const db = getPrisma();
    const where: Prisma.ModerationLogWhereInput = { guildId };

    if (options?.type) {
      where.action = options.type;
    }
    if (options?.moderatorId) {
      where.moderatorId = options.moderatorId;
    }
    if (options?.targetId) {
      where.targetId = options.targetId;
    }

    const limit = options?.limit ?? 25;

    const logs = await db.moderationLog.findMany({
      where,
      include: { moderator: true },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });

    return logs;
  }

  static async getLogById(
    guildId: string,
    logId: string,
  ): Promise<LogEntry | null> {
    const db = getPrisma();
    return db.moderationLog.findFirst({
      where: { id: logId, guildId },
      include: { moderator: true },
    });
  }

  static async deleteLog(guildId: string, logId: string): Promise<boolean> {
    const db = getPrisma();
    try {
      const result = await db.moderationLog.deleteMany({
        where: { id: logId, guildId },
      });
      const deleted = result.count > 0;
      if (deleted) {
        log.info(`Log silindi: ${logId}`);
      }
      return deleted;
    } catch (error) {
      log.error('Log silme hatası', error);
      throw error;
    }
  }

  static async clearLogs(
    guildId: string,
    type?: string,
  ): Promise<number> {
    const db = getPrisma();
    try {
      const where: Prisma.ModerationLogWhereInput = { guildId };
      if (type) {
        where.action = type;
      }
      const result = await db.moderationLog.deleteMany({ where });
      log.info(`${result.count} log temizlendi: ${guildId}`);
      return result.count;
    } catch (error) {
      log.error('Log temizleme hatası', error);
      throw error;
    }
  }

  static async getLogCount(
    guildId: string,
    type?: string,
  ): Promise<number> {
    const db = getPrisma();
    const where: Prisma.ModerationLogWhereInput = { guildId };
    if (type) {
      where.action = type;
    }
    return db.moderationLog.count({ where });
  }
}
