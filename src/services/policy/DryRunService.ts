import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('DRY_RUN');

export interface DryRunLog {
  id: string;
  guildId: string;
  userId: string;
  moderatorId: string;
  action: string;
  reason: string;
  duration: string | null;
  details: unknown;
  createdAt: Date;
}

export interface DryRunResult {
  dryRunId: string;
  action: string;
  userId: string;
  moderatorId: string;
  reason: string;
  duration?: string;
  wouldExecute: boolean;
  caseCreated: boolean;
  logCreated: boolean;
}

export class DryRunService {
  static async log(data: {
    guildId: string;
    userId: string;
    moderatorId: string;
    action: string;
    reason: string;
    duration?: string;
    details?: Record<string, unknown>;
  }): Promise<DryRunLog> {
    const db = getPrisma();
    try {
      const logEntry = await db.dryRunLog.create({
        data: {
          guildId: data.guildId,
          userId: data.userId,
          moderatorId: data.moderatorId,
          action: data.action,
          reason: data.reason,
          duration: data.duration,
          details: (data.details as unknown as Prisma.InputJsonValue) || undefined,
        },
      });
      log.info(`Dry run log oluşturuldu: ${logEntry.id}`);
      return logEntry as unknown as DryRunLog;
    } catch (error) {
      log.error('Dry run log hatası', error);
      throw error;
    }
  }

  static async getByGuild(guildId: string, limit: number = 25): Promise<DryRunLog[]> {
    const db = getPrisma();
    const logs = await db.dryRunLog.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs as unknown as DryRunLog[];
  }

  static async getByUser(guildId: string, userId: string, limit: number = 25): Promise<DryRunLog[]> {
    const db = getPrisma();
    const logs = await db.dryRunLog.findMany({
      where: { guildId, userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs as unknown as DryRunLog[];
  }

  static async getByModerator(guildId: string, moderatorId: string, limit: number = 25): Promise<DryRunLog[]> {
    const db = getPrisma();
    const logs = await db.dryRunLog.findMany({
      where: { guildId, moderatorId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return logs as unknown as DryRunLog[];
  }

  static async clear(guildId: string): Promise<number> {
    const db = getPrisma();
    try {
      const result = await db.dryRunLog.deleteMany({
        where: { guildId },
      });
      log.info(`Dry run logları temizlendi: ${guildId} (${result.count} kayıt)`);
      return result.count;
    } catch (error) {
      log.error('Dry run log temizleme hatası', error);
      return 0;
    }
  }

  static async getStats(guildId: string) {
    const db = getPrisma();
    const logs = await db.dryRunLog.findMany({
      where: { guildId },
    });

    const actionCounts: Record<string, number> = {};
    for (const log of logs) {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
    }

    return {
      total: logs.length,
      actions: actionCounts,
      uniqueUsers: new Set(logs.map((l: DryRunLog) => l.userId)).size,
      uniqueModerators: new Set(logs.map((l: DryRunLog) => l.moderatorId)).size,
    };
  }

  static formatDryRunEntry(log: DryRunLog): string {
    const lines: string[] = [
      `**İşlem:** ${log.action}`,
      `**Hedef:** <@${log.userId}>`,
      `**Moderatör:** <@${log.moderatorId}>`,
      `**Sebep:** ${log.reason}`,
    ];

    if (log.duration) {
      lines.push(`**Süre:** ${log.duration}`);
    }

    lines.push(`**Tarih:** <t:${Math.floor(log.createdAt.getTime() / 1000)}:R>`);
    lines.push('');
    lines.push('*Bu bir dry run işlemidir. Discord API çağrılmamıştır.*');

    return lines.join('\n');
  }

  static formatDryRunResult(result: DryRunResult): string {
    const lines: string[] = [
      `**Dry Run Sonucu**`,
      '',
      `**İşlem:** ${result.action}`,
      `**Hedef:** <@${result.userId}>`,
      `**Moderatör:** <@${result.moderatorId}>`,
      `**Sebep:** ${result.reason}`,
    ];

    if (result.duration) {
      lines.push(`**Süre:** ${result.duration}`);
    }

    lines.push('');
    lines.push('**Gerçekleştirilen İşlemler:**');
    lines.push(`${result.caseCreated ? '' : ''} Case oluşturuldu`);
    lines.push(`${result.logCreated ? '' : ''} Log oluşturuldu`);
    lines.push(`Discord API çağrılmadı`);

    return lines.join('\n');
  }
}
