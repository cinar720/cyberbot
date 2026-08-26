import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('TIMELINE');

export interface TimelineEntry {
  id: string;
  caseId: string;
  action: string;
  actorId: string | null;
  details: unknown;
  createdAt: Date;
}

export class TimelineService {
  static async addEntry(
    caseId: string,
    action: string,
    actorId?: string,
    details?: Record<string, unknown>
  ): Promise<TimelineEntry> {
    const db = getPrisma();
    try {
      const entry = await db.caseTimeline.create({
        data: {
          caseId,
          action,
          actorId,
          details: (details as unknown as Prisma.InputJsonValue) || undefined,
        },
      });
      log.info(`Timeline eklendi: ${action} (Case: ${caseId})`);
      return entry as unknown as TimelineEntry;
    } catch (error) {
      log.error('Timeline ekleme hatası', error);
      throw error;
    }
  }

  static async getTimeline(caseId: string): Promise<TimelineEntry[]> {
    const db = getPrisma();
    const entries = await db.caseTimeline.findMany({
      where: { caseId },
      orderBy: { createdAt: 'asc' },
    });
    return entries as unknown as TimelineEntry[];
  }

  static async getRecentEntries(guildId: string, limit: number = 50): Promise<TimelineEntry[]> {
    const db = getPrisma();
    const entries = await db.caseTimeline.findMany({
      where: {
        case: { guildId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return entries as unknown as TimelineEntry[];
  }

  static async getEntriesByAction(guildId: string, action: string, limit: number = 50): Promise<TimelineEntry[]> {
    const db = getPrisma();
    const entries = await db.caseTimeline.findMany({
      where: {
        action,
        case: { guildId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return entries as unknown as TimelineEntry[];
  }

  static async getEntriesByActor(guildId: string, actorId: string, limit: number = 50): Promise<TimelineEntry[]> {
    const db = getPrisma();
    const entries = await db.caseTimeline.findMany({
      where: {
        actorId,
        case: { guildId },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return entries as unknown as TimelineEntry[];
  }

  static async deleteTimeline(caseId: string): Promise<number> {
    const db = getPrisma();
    try {
      const result = await db.caseTimeline.deleteMany({
        where: { caseId },
      });
      log.info(`Timeline silindi: ${caseId} (${result.count} giriş)`);
      return result.count;
    } catch (error) {
      log.error('Timeline silme hatası', error);
      return 0;
    }
  }

  static formatTimeline(entries: TimelineEntry[]): string {
    if (entries.length === 0) return 'Timeline bulunamadı.';

    const lines: string[] = ['**Case Timeline:**', ''];

    for (const entry of entries) {
      const actor = entry.actorId ? `<@${entry.actorId}>` : 'Sistem';
      const time = `<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`;

      let detailsStr = '';
      if (entry.details) {
        const details = entry.details as Record<string, unknown>;
        const parts: string[] = [];
        if (details.reason) parts.push(`Sebep: ${details.reason}`);
        if (details.duration) parts.push(`Süre: ${details.duration}`);
        if (details.oldStatus) parts.push(`Eski: ${details.oldStatus}`);
        if (details.newStatus) parts.push(`Yeni: ${details.newStatus}`);
        if (parts.length > 0) detailsStr = ` (${parts.join(', ')})`;
      }

      lines.push(`${time} | ${this.getActionEmoji(entry.action)} **${entry.action}** - ${actor}${detailsStr}`);
    }

    return lines.join('\n');
  }

  static getActionEmoji(action: string): string {
    const emojis: Record<string, string> = {
      'CASE_CREATED': '',
      'EVIDENCE_ADDED': '',
      'PUNISHMENT_APPLIED': '',
      'PUNISHMENT_REVOKED': '',
      'APPEAL_OPENED': '',
      'APPEAL_APPROVED': '',
      'APPEAL_REJECTED': '',
      'ESCALATION_TRIGGERED': '',
      'DMS_SENT': '',
      'DMS_FAILED': '',
      'POLICY_CHECK': '',
      'PERMISSION_CHECK': '',
      'DRY_RUN': '',
      'MANUAL_OVERRIDE': '',
    };
    return emojis[action] || '';
  }
}
