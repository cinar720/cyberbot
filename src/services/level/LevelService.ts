import { type Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('LEVEL');

export interface LevelData {
  guildId: string;
  userId: string;
  xp: number;
  level: number;
  totalXp: number;
  messages: number;
  lastXpAt: Date | null;
}

export interface LevelConfigData {
  guildId: string;
  xpPerMessage: number;
  xpCooldown: number;
  levelUpChannelId: string | null;
  levelUpMessage: string;
  roleRewards: unknown;
  enabled: boolean;
}

export interface LevelUpResult {
  leveled: boolean;
  newLevel: number;
  newXp: number;
}

export class LevelService {
  static calculateLevel(xp: number): number {
    return Math.floor(0.1 * Math.sqrt(xp));
  }

  static getXpForLevel(level: number): number {
    return Math.pow(level / 0.1, 2);
  }

  static async getConfig(guildId: string): Promise<LevelConfigData | null> {
    const db = getPrisma();
    try {
      const config = await db.levelConfig.findUnique({
        where: { guildId },
      });
      if (!config) return null;
      return {
        guildId: config.guildId,
        xpPerMessage: config.xpPerMessage,
        xpCooldown: config.xpCooldown,
        levelUpChannelId: config.levelUpChannelId,
        levelUpMessage: config.levelUpMessage,
        roleRewards: config.roleRewards,
        enabled: config.enabled,
      };
    } catch (error) {
      log.error(`Level config getirme hatası: ${guildId}`, error);
      return null;
    }
  }

  static async updateConfig(guildId: string, data: Partial<Omit<LevelConfigData, 'guildId'>>): Promise<LevelConfigData> {
    const db = getPrisma();
    try {
      const updateData: Record<string, unknown> = {};
      if (data.xpPerMessage !== undefined) updateData.xpPerMessage = data.xpPerMessage;
      if (data.xpCooldown !== undefined) updateData.xpCooldown = data.xpCooldown;
      if (data.levelUpChannelId !== undefined) updateData.levelUpChannelId = data.levelUpChannelId;
      if (data.levelUpMessage !== undefined) updateData.levelUpMessage = data.levelUpMessage;
      if (data.roleRewards !== undefined) updateData.roleRewards = data.roleRewards as Prisma.InputJsonValue;
      if (data.enabled !== undefined) updateData.enabled = data.enabled;

      const config = await db.levelConfig.upsert({
        where: { guildId },
        update: updateData,
        create: {
          guildId,
          ...(data.xpPerMessage !== undefined ? { xpPerMessage: data.xpPerMessage } : {}),
          ...(data.xpCooldown !== undefined ? { xpCooldown: data.xpCooldown } : {}),
          ...(data.levelUpChannelId !== undefined ? { levelUpChannelId: data.levelUpChannelId } : {}),
          ...(data.levelUpMessage !== undefined ? { levelUpMessage: data.levelUpMessage } : {}),
          ...(data.roleRewards !== undefined ? { roleRewards: data.roleRewards as Prisma.InputJsonValue } : {}),
          ...(data.enabled !== undefined ? { enabled: data.enabled } : {}),
        },
      });
      log.info(`Level config güncellendi: ${guildId}`);
      return {
        guildId: config.guildId,
        xpPerMessage: config.xpPerMessage,
        xpCooldown: config.xpCooldown,
        levelUpChannelId: config.levelUpChannelId,
        levelUpMessage: config.levelUpMessage,
        roleRewards: config.roleRewards,
        enabled: config.enabled,
      };
    } catch (error) {
      log.error(`Level config güncelleme hatası: ${guildId}`, error);
      throw error;
    }
  }

  static async getLevel(guildId: string, userId: string): Promise<LevelData | null> {
    const db = getPrisma();
    try {
      const userLevel = await db.userLevel.findUnique({
        where: { guildId_userId: { guildId, userId } },
      });
      if (!userLevel) return null;
      return {
        guildId: userLevel.guildId,
        userId: userLevel.userId,
        xp: userLevel.xp,
        level: userLevel.level,
        totalXp: userLevel.totalXp,
        messages: userLevel.messages,
        lastXpAt: userLevel.lastXpAt,
      };
    } catch (error) {
      log.error(`Level getirme hatası: ${guildId}/${userId}`, error);
      return null;
    }
  }

  static async addXp(guildId: string, userId: string, amount: number): Promise<LevelUpResult> {
    const db = getPrisma();

    try {
      let userLevel = await db.userLevel.findUnique({
        where: { guildId_userId: { guildId, userId } },
      });

      if (!userLevel) {
        const initialLevel = this.calculateLevel(amount);
        userLevel = await db.userLevel.create({
          data: { guildId, userId, xp: amount, level: initialLevel, totalXp: amount, messages: 1 },
        });
        return { leveled: false, newLevel: initialLevel, newXp: amount };
      }

      const oldLevel = userLevel.level;
      const newXp = userLevel.xp + amount;
      const newTotalXp = userLevel.totalXp + amount;
      const newLevel = this.calculateLevel(newTotalXp);
      const leveled = newLevel > oldLevel;

      await db.userLevel.update({
        where: { guildId_userId: { guildId, userId } },
        data: {
          xp: newXp,
          totalXp: newTotalXp,
          level: newLevel,
          messages: { increment: 1 },
          lastXpAt: new Date(),
        },
      });

      return { leveled, newLevel, newXp };
    } catch (error) {
      log.error(`XP ekleme hatasi: ${guildId}/${userId}`, error);
      return { leveled: false, newLevel: 0, newXp: 0 };
    }
  }

  static async getLeaderboard(guildId: string, limit: number = 10): Promise<LevelData[]> {
    const db = getPrisma();
    try {
      const levels = await db.userLevel.findMany({
        where: { guildId },
        orderBy: [{ totalXp: 'desc' }],
        take: limit,
      });
      return levels.map((l) => ({
        guildId: l.guildId,
        userId: l.userId,
        xp: l.xp,
        level: l.level,
        totalXp: l.totalXp,
        messages: l.messages,
        lastXpAt: l.lastXpAt,
      }));
    } catch (error) {
      log.error(`Leaderboard getirme hatası: ${guildId}`, error);
      return [];
    }
  }
}
