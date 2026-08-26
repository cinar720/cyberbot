import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('POLICY_COOLDOWN');

export class PolicyCooldownService {
  static async set(guildId: string, userId: string, action: string, durationMinutes: number): Promise<void> {
    const db = getPrisma();
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    try {
      const existing = await db.policyCooldown.findUnique({
        where: { guildId_userId_action: { guildId, userId, action } },
      });

      if (existing) {
        await db.policyCooldown.update({
          where: { id: existing.id },
          data: { expiresAt },
        });
      } else {
        await db.policyCooldown.create({
          data: {
            guildId,
            userId,
            action,
            expiresAt,
          },
        });
      }
      log.info(`Cooldown ayarlandı: ${userId} - ${action} (${durationMinutes}dk)`);
    } catch (error) {
      log.error('Cooldown ayarlama hatası', error);
    }
  }

  static async check(guildId: string, userId: string, action: string): Promise<{ onCooldown: boolean; expiresAt?: Date }> {
    const db = getPrisma();
    const cooldown = await db.policyCooldown.findUnique({
      where: { guildId_userId_action: { guildId, userId, action } },
    });

    if (!cooldown) {
      return { onCooldown: false };
    }

    if (cooldown.expiresAt < new Date()) {
      // Cooldown süresi dolmuş, temizle
      await this.remove(guildId, userId, action);
      return { onCooldown: false };
    }

    return { onCooldown: true, expiresAt: cooldown.expiresAt };
  }

  static async remove(guildId: string, userId: string, action: string): Promise<void> {
    const db = getPrisma();
    try {
      await db.policyCooldown.deleteMany({
        where: { guildId, userId, action },
      });
    } catch (error) {
      log.error('Cooldown silme hatası', error);
    }
  }

  static async clear(guildId: string, userId: string): Promise<number> {
    const db = getPrisma();
    try {
      const result = await db.policyCooldown.deleteMany({
        where: { guildId, userId },
      });
      return result.count;
    } catch (error) {
      log.error('Cooldown temizleme hatası', error);
      return 0;
    }
  }

  static async getActive(guildId: string, userId: string): Promise<Array<{ action: string; expiresAt: Date }>> {
    const db = getPrisma();
    const now = new Date();
    const cooldowns = await db.policyCooldown.findMany({
      where: {
        guildId,
        userId,
        expiresAt: { gt: now },
      },
      orderBy: { expiresAt: 'asc' },
    });
    return cooldowns;
  }

  static async cleanup(): Promise<number> {
    const db = getPrisma();
    try {
      const now = new Date();
      const result = await db.policyCooldown.deleteMany({
        where: {
          expiresAt: { lt: now },
        },
      });
      if (result.count > 0) {
        log.info(`Süresi dolan cooldown'lar temizlendi: ${result.count}`);
      }
      return result.count;
    } catch (error) {
      log.error('Cooldown temizleme hatası', error);
      return 0;
    }
  }
}
