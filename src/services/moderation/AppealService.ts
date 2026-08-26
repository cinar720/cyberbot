import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('APPEAL');

export type AppealStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface AppealData {
  caseId: string;
  userId: string;
  reason: string;
}

export class AppealService {
  static async create(data: AppealData) {
    const db = getPrisma();
    try {
      const appeal = await db.appeal.create({
        data: {
          caseId: data.caseId,
          userId: data.userId,
          reason: data.reason,
        },
        include: {
          case: true,
          user: true,
        },
      });
      log.info(`Başvuru oluşturuldu: ${appeal.id} (Case: ${data.caseId})`);
      return appeal;
    } catch (error) {
      log.error('Başvuru oluşturma hatası', error);
      throw error;
    }
  }

  static async getById(appealId: string) {
    const db = getPrisma();
    return db.appeal.findUnique({
      where: { id: appealId },
      include: {
        case: {
          include: {
            target: true,
            moderator: true,
            evidence: true,
          },
        },
        user: true,
      },
    });
  }

  static async getPending(guildId: string) {
    const db = getPrisma();
    return db.appeal.findMany({
      where: {
        status: 'PENDING',
        case: { guildId },
      },
      include: {
        case: {
          include: {
            target: true,
            moderator: true,
          },
        },
        user: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  static async getByUser(guildId: string, userId: string) {
    const db = getPrisma();
    return db.appeal.findMany({
      where: {
        userId,
        case: { guildId },
      },
      include: {
        case: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async approve(appealId: string, reviewedBy: string, response: string) {
    const db = getPrisma();
    try {
      const appeal = await db.appeal.update({
        where: { id: appealId },
        data: {
          status: 'APPROVED',
          reviewedBy,
          response,
          reviewedAt: new Date(),
        },
        include: {
          case: true,
          user: true,
        },
      });
      log.info(`Başvuru onaylandı: ${appeal.id}`);
      return appeal;
    } catch (error) {
      log.error('Başvuru onaylama hatası', error);
      throw error;
    }
  }

  static async reject(appealId: string, reviewedBy: string, response: string) {
    const db = getPrisma();
    try {
      const appeal = await db.appeal.update({
        where: { id: appealId },
        data: {
          status: 'REJECTED',
          reviewedBy,
          response,
          reviewedAt: new Date(),
        },
        include: {
          case: true,
          user: true,
        },
      });
      log.info(`Başvuru reddedildi: ${appeal.id}`);
      return appeal;
    } catch (error) {
      log.error('Başvuru reddetme hatası', error);
      throw error;
    }
  }

  static async getStats(guildId: string) {
    const db = getPrisma();
    const appeals = await db.appeal.findMany({
      where: { case: { guildId } },
    });

    return {
      total: appeals.length,
      pending: appeals.filter((a) => a.status === 'PENDING').length,
      approved: appeals.filter((a) => a.status === 'APPROVED').length,
      rejected: appeals.filter((a) => a.status === 'REJECTED').length,
    };
  }

  static async hasPendingAppeal(caseId: string): Promise<boolean> {
    const db = getPrisma();
    const count = await db.appeal.count({
      where: {
        caseId,
        status: 'PENDING',
      },
    });
    return count > 0;
  }
}
