import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('PREMIUM');

export interface PremiumData {
  id: string;
  userId: string;
  grantedBy: string;
  grantedAt: Date;
  expiresAt: Date | null;
  active: boolean;
}

export type PremiumResult =
  | { status: 'found'; data: PremiumData }
  | { status: 'not_found' }
  | { status: 'error' };

export class PremiumService {
  private static async ensureUser(userId: string): Promise<void> {
    const prisma = getPrisma();
    const existing = await prisma.user.findUnique({ where: { userId } });
    if (!existing) {
      await prisma.user.create({
        data: { userId, username: userId },
      });
    }
  }

  static async hasPremium(userId: string): Promise<boolean> {
    try {
      const prisma = getPrisma();
      const premium = await prisma.premium.findUnique({
        where: { userId },
      });

      if (!premium || !premium.active) return false;

      if (premium.expiresAt && premium.expiresAt < new Date()) {
        return false;
      }

      return true;
    } catch (error) {
      log.error(`Premium kontrolü başarısız (DB hatalı): ${userId}`, error);
      return false;
    }
  }

  static async getPremium(userId: string): Promise<PremiumData | null> {
    try {
      const prisma = getPrisma();
      const premium = await prisma.premium.findUnique({
        where: { userId },
      });

      if (!premium) return null;

      return {
        id: premium.id,
        userId: premium.userId,
        grantedBy: premium.grantedBy,
        grantedAt: premium.grantedAt,
        expiresAt: premium.expiresAt,
        active: premium.active,
      };
    } catch (error) {
      log.error(`Premium getirme başarısız (DB hatalı): ${userId}`, error);
      return null;
    }
  }

  static async getPremiumSafe(userId: string): Promise<PremiumResult> {
    try {
      const prisma = getPrisma();
      const premium = await prisma.premium.findUnique({
        where: { userId },
      });

      if (!premium) return { status: 'not_found' };

      return {
        status: 'found',
        data: {
          id: premium.id,
          userId: premium.userId,
          grantedBy: premium.grantedBy,
          grantedAt: premium.grantedAt,
          expiresAt: premium.expiresAt,
          active: premium.active,
        },
      };
    } catch (error) {
      log.error(`Premium getirme başarısız (DB hatalı): ${userId}`, error);
      return { status: 'error' };
    }
  }

  static async grantPermanent(userId: string, grantedBy: string): Promise<PremiumData> {
    try {
      const prisma = getPrisma();

      const existing = await prisma.premium.findUnique({
        where: { userId },
      });

      if (existing) {
        if (existing.expiresAt === null && existing.active) {
          log.info(`Kullanıcı zaten kalıcı premium: ${userId}`);
          return {
            id: existing.id,
            userId: existing.userId,
            grantedBy: existing.grantedBy,
            grantedAt: existing.grantedAt,
            expiresAt: existing.expiresAt,
            active: existing.active,
          };
        }

        const updated = await prisma.premium.update({
          where: { userId },
          data: {
            expiresAt: null,
            active: true,
            grantedBy,
            grantedAt: new Date(),
          },
        });

        log.info(`Premium güncellendi (kalıcı): ${userId}`);
        return {
          id: updated.id,
          userId: updated.userId,
          grantedBy: updated.grantedBy,
          grantedAt: updated.grantedAt,
          expiresAt: updated.expiresAt,
          active: updated.active,
        };
      }

      await this.ensureUser(userId);
      const created = await prisma.premium.create({
        data: {
          userId,
          grantedBy,
          expiresAt: null,
          active: true,
        },
      });

      log.info(`Premium verildi (kalıcı): ${userId}`);
      return {
        id: created.id,
        userId: created.userId,
        grantedBy: created.grantedBy,
        grantedAt: created.grantedAt,
        expiresAt: created.expiresAt,
        active: created.active,
      };
    } catch (error) {
      log.error(`Premium verme başarısız (DB hatalı): ${userId}`, error);
      throw new Error('Veritabanı bağlantısı kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  }

  static async grantTimed(userId: string, grantedBy: string, expiresAt: Date): Promise<PremiumData> {
    try {
      const prisma = getPrisma();

      const existing = await prisma.premium.findUnique({
        where: { userId },
      });

      if (existing) {
        const updated = await prisma.premium.update({
          where: { userId },
          data: {
            expiresAt,
            active: true,
            grantedBy,
            grantedAt: new Date(),
          },
        });

        log.info(`Premium güncellendi (süreli): ${userId} - Bitiş: ${expiresAt.toISOString()}`);
        return {
          id: updated.id,
          userId: updated.userId,
          grantedBy: updated.grantedBy,
          grantedAt: updated.grantedAt,
          expiresAt: updated.expiresAt,
          active: updated.active,
        };
      }

      await this.ensureUser(userId);
      const created = await prisma.premium.create({
        data: {
          userId,
          grantedBy,
          expiresAt,
          active: true,
        },
      });

      log.info(`Premium verildi (süreli): ${userId} - Bitiş: ${expiresAt.toISOString()}`);
      return {
        id: created.id,
        userId: created.userId,
        grantedBy: created.grantedBy,
        grantedAt: created.grantedAt,
        expiresAt: created.expiresAt,
        active: created.active,
      };
    } catch (error) {
      log.error(`Süreli premium verme başarısız (DB hatalı): ${userId}`, error);
      throw new Error('Veritabanı bağlantısı kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  }

  static async revokePremium(userId: string): Promise<boolean> {
    try {
      const prisma = getPrisma();

      const existing = await prisma.premium.findUnique({
        where: { userId },
      });

      if (!existing) return false;

      await prisma.premium.update({
        where: { userId },
        data: { active: false },
      });

      log.info(`Premium kaldırıldı: ${userId}`);
      return true;
    } catch (error) {
      log.error(`Premium kaldırma başarısız (DB hatalı): ${userId}`, error);
      throw new Error('Veritabanı bağlantısı kullanılamıyor. Lütfen daha sonra tekrar deneyin.');
    }
  }

  static isExpired(premium: PremiumData): boolean {
    if (!premium.active) return true;
    if (premium.expiresAt && premium.expiresAt < new Date()) return true;
    return false;
  }

  static getRemainingTime(premium: PremiumData): string | null {
    if (premium.expiresAt === null) return 'Kalıcı';
    if (this.isExpired(premium)) return 'Süresi dolmuş';

    const now = new Date();
    const diff = premium.expiresAt.getTime() - now.getTime();

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    const parts: string[] = [];
    if (days > 0) parts.push(`${days} gün`);
    if (hours > 0) parts.push(`${hours} saat`);
    if (minutes > 0) parts.push(`${minutes} dakika`);

    return parts.join(', ') || 'Az kaldı';
  }
}
