import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('AUDIT');

export interface AuditData {
  guildId: string;
  moderatorId: string;
  targetId?: string;
  action: string;
  details?: Record<string, unknown>;
  caseNumber?: number;
}

export class AuditService {
  static async log(data: AuditData) {
    const db = getPrisma();
    try {
      const auditLog = await db.moderationLog.create({
        data: {
          guildId: data.guildId,
          moderatorId: data.moderatorId,
          targetId: data.targetId,
          action: data.action,
          details: data.details as unknown as Prisma.InputJsonValue,
          caseNumber: data.caseNumber,
        },
      });
      log.info(`Audit log: ${data.action} by ${data.moderatorId}`);
      return auditLog;
    } catch (error) {
      log.error('Audit log hatası', error);
      throw error;
    }
  }

  static async getRecent(guildId: string, limit: number = 25) {
    const db = getPrisma();
    return db.moderationLog.findMany({
      where: { guildId },
      include: {
        moderator: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getByModerator(guildId: string, moderatorId: string, limit: number = 25) {
    const db = getPrisma();
    return db.moderationLog.findMany({
      where: { guildId, moderatorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getByTarget(guildId: string, targetId: string, limit: number = 25) {
    const db = getPrisma();
    return db.moderationLog.findMany({
      where: { guildId, targetId },
      include: {
        moderator: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getByAction(guildId: string, action: string, limit: number = 25) {
    const db = getPrisma();
    return db.moderationLog.findMany({
      where: { guildId, action },
      include: {
        moderator: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async getByDateRange(guildId: string, start: Date, end: Date) {
    const db = getPrisma();
    return db.moderationLog.findMany({
      where: {
        guildId,
        createdAt: {
          gte: start,
          lte: end,
        },
      },
      include: {
        moderator: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getStats(guildId: string) {
    const db = getPrisma();
    const logs = await db.moderationLog.findMany({
      where: { guildId },
    });

    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    return {
      total: logs.length,
      actions: actionCounts,
      uniqueModerators: new Set(logs.map((l) => l.moderatorId)).size,
      uniqueTargets: new Set(logs.filter((l) => l.targetId).map((l) => l.targetId)).size,
    };
  }

  static formatLogEntry(log: {
    action: string;
    moderatorId: string;
    targetId?: string | null;
    caseNumber?: number | null;
    createdAt: Date;
    details?: unknown;
  }): string {
    const parts: string[] = [];

    if (log.caseNumber) {
      parts.push(`Case: #${String(log.caseNumber).padStart(6, '0')}`);
    }

    parts.push(`İşlem: ${log.action}`);

    if (log.targetId) {
      parts.push(`Hedef: <@${log.targetId}>`);
    }

    parts.push(`Moderatör: <@${log.moderatorId}>`);
    parts.push(`Tarih: <t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`);

    return parts.join(' | ');
  }
}
