import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';
import type { PunishmentType, Platform, Prisma } from '@prisma/client';

const log = new Logger('CASE');

export interface CaseData {
  guildId: string;
  moderatorId: string;
  type: string;
  reason: string;
  reasonCode?: string;
  duration?: number;
  durationText?: string;
  expiresAt?: Date | null;
  platform?: 'DISCORD' | 'GAME';
  targetUserId?: string;
  targetChannelId?: string;
  metadata?: Record<string, unknown>;
}

export class CaseService {
  static async create(data: CaseData) {
    const db = getPrisma();
    try {
      const guild = await db.guild.update({
        where: { guildId: data.guildId },
        data: { caseCount: { increment: 1 } },
      });

      const caseNumber = guild.caseCount;

      const caseRecord = await db.case.create({
        data: {
          caseNumber,
          guildId: data.guildId,
          targetId: data.targetUserId ?? null,
          targetChannelId: data.targetChannelId ?? null,
          moderatorId: data.moderatorId,
          type: data.type as PunishmentType,
          reason: data.reason,
          reasonCode: data.reasonCode,
          duration: data.duration,
          durationText: data.durationText,
          expiresAt: data.expiresAt,
          platform: (data.platform || 'DISCORD') as Platform,
          metadata: data.metadata as Prisma.InputJsonValue | undefined,
        },
        include: {
          target: true,
          moderator: true,
          evidence: true,
        },
      });

      log.info(`Case oluşturuldu: #${caseNumber} (${data.guildId})`);
      return caseRecord;
    } catch (error) {
      log.error('Case oluşturma hatası', error);
      throw error;
    }
  }

  static async getByNumber(guildId: string, caseNumber: number) {
    const db = getPrisma();
    return db.case.findUnique({
      where: { guildId_caseNumber: { guildId, caseNumber } },
      include: {
        target: true,
        moderator: true,
        evidence: true,
        appeals: true,
      },
    });
  }

  static async getById(caseId: string) {
    const db = getPrisma();
    return db.case.findUnique({
      where: { id: caseId },
      include: {
        target: true,
        moderator: true,
        evidence: true,
        appeals: true,
      },
    });
  }

  static async getActiveByUser(guildId: string, targetId: string) {
    const db = getPrisma();
    return db.case.findMany({
      where: {
        guildId,
        targetId,
        active: true,
      },
      include: {
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getAllByUser(guildId: string, targetId: string) {
    const db = getPrisma();
    return db.case.findMany({
      where: { guildId, targetId },
      include: {
        evidence: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getByChannel(guildId: string, targetChannelId: string) {
    const db = getPrisma();
    return db.case.findMany({
      where: { guildId, targetChannelId },
      include: {
        moderator: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async getRecent(guildId: string, limit: number = 10) {
    const db = getPrisma();
    return db.case.findMany({
      where: { guildId },
      include: {
        target: true,
        moderator: true,
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }

  static async revoke(caseId: string, revokedBy: string, reason: string) {
    const db = getPrisma();
    try {
      const caseRecord = await db.case.update({
        where: { id: caseId },
        data: {
          active: false,
          revoked: true,
          revokedBy,
          revokedReason: reason,
        },
        include: {
          target: true,
          moderator: true,
        },
      });
      log.info(`Case iptal edildi: #${caseRecord.caseNumber}`);
      return caseRecord;
    } catch (error) {
      log.error('Case iptal hatası', error);
      throw error;
    }
  }

  static async getStats(guildId: string, targetId: string) {
    const db = getPrisma();
    const cases = await db.case.findMany({
      where: { guildId, targetId },
      include: { appeals: true },
    });

    return {
      total: cases.length,
      active: cases.filter((c) => c.active).length,
      banned: cases.filter((c) => c.type === 'BAN' && c.active).length,
      kicked: cases.filter((c) => c.type === 'KICK').length,
      muted: cases.filter((c) => c.type === 'MUTE' && c.active).length,
      warned: cases.filter((c) => c.type === 'WARN').length,
      jailed: cases.filter((c) => c.type === 'JAIL' && c.active).length,
      timedOut: cases.filter((c) => c.type === 'TIMEOUT' && c.active).length,
      appeals: cases.filter((c) => c.appeals?.length > 0).length,
    };
  }

  static async getNextCaseNumber(guildId: string): Promise<number> {
    const db = getPrisma();
    const guild = await db.guild.findUnique({ where: { guildId } });
    return (guild?.caseCount || 0) + 1;
  }

  static formatCaseNumber(num: number): string {
    return `#${String(num).padStart(6, '0')}`;
  }
}
