import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('RULE_ENGINE');

export interface ViolationRule {
  id: string;
  guildId: string;
  code: string;
  name: string;
  description: string | null;
  category: string;
  enabled: boolean;
  punishmentType: string;
  duration: string | null;
  points: number;
  autoReport: boolean;
  cooldownMinutes: number;
  maxOccurrences: number | null;
  escalationChainId: string | null;
}

export interface RuleCheckResult {
  allowed: boolean;
  rule?: ViolationRule;
  reason?: string;
  shouldEscalate: boolean;
  currentCount: number;
}

const DEFAULT_RULES: Array<{
  code: string;
  name: string;
  description: string;
  category: string;
  punishmentType: string;
  duration?: string;
  points: number;
  cooldownMinutes: number;
  maxOccurrences?: number;
}> = [
  { code: 'SPAM', name: 'Spam', description: 'Aynı mesajı tekrar tekrar gönderme', category: 'GENEL', punishmentType: 'WARN', points: 1, cooldownMinutes: 5, maxOccurrences: 3 },
  { code: 'REKLAM', name: 'Reklam', description: 'Discord davet linki veya reklam paylaşma', category: 'GENEL', punishmentType: 'WARN', points: 2, cooldownMinutes: 0, maxOccurrences: 2 },
  { code: 'HAKARET', name: 'Hakaret', description: 'Kullanıcılara hakaret etme', category: 'GENEL', punishmentType: 'WARN', points: 2, cooldownMinutes: 10, maxOccurrences: 2 },
  { code: 'KUFUR', name: 'Küfür', description: 'Küfür içerikli mesaj gönderme', category: 'GENEL', punishmentType: 'WARN', points: 1, cooldownMinutes: 5, maxOccurrences: 3 },
  { code: 'FLOOD', name: 'Flood', description: 'Çok fazla mesaj gönderme', category: 'GENEL', punishmentType: 'WARN', points: 1, cooldownMinutes: 5, maxOccurrences: 3 },
  { code: 'NSFW', name: 'NSFW İçerik', description: 'Uygunsuz içerik paylaşma', category: 'ICERIK', punishmentType: 'TIMEOUT', duration: '1h', points: 3, cooldownMinutes: 0, maxOccurrences: 1 },
  { code: 'TROLL', name: 'Troll', description: 'Trolluk yapma', category: 'GENEL', punishmentType: 'WARN', points: 1, cooldownMinutes: 10, maxOccurrences: 3 },
  { code: 'RDM', name: 'RDM', description: 'Random Deathmatch', category: 'RP', punishmentType: 'WARN', points: 2, cooldownMinutes: 15, maxOccurrences: 2 },
  { code: 'VDM', name: 'VDM', description: 'Vehicle Deathmatch', category: 'RP', punishmentType: 'WARN', points: 3, cooldownMinutes: 15, maxOccurrences: 1 },
  { code: 'FEARRP', name: 'FearRP', description: 'FearRP ihlali', category: 'RP', punishmentType: 'WARN', points: 2, cooldownMinutes: 15, maxOccurrences: 2 },
  { code: 'POWERGAMING', name: 'PowerGaming', description: 'PowerGaming', category: 'RP', punishmentType: 'WARN', points: 1, cooldownMinutes: 10, maxOccurrences: 3 },
  { code: 'RP_IHLALI', name: 'RP İhlali', description: 'Genel RP kuralı ihlali', category: 'RP', punishmentType: 'WARN', points: 1, cooldownMinutes: 10, maxOccurrences: 3 },
  { code: 'ALTK', name: 'Alt Hesap', description: 'Alt hesap kullanma', category: 'GUVENLIK', punishmentType: 'BAN', points: 5, cooldownMinutes: 0, maxOccurrences: 1 },
  { code: 'AUTOMOD', name: 'Otomatik Moderasyon', description: 'Otomatik moderasyona yakalanma', category: 'SISTEM', punishmentType: 'WARN', points: 1, cooldownMinutes: 0, maxOccurrences: 5 },
];

export class RuleEngine {
  static async getRule(guildId: string, code: string): Promise<ViolationRule | null> {
    const db = getPrisma();
    const rule = await db.violationRule.findUnique({
      where: { guildId_code: { guildId, code } },
    });
    return rule as unknown as ViolationRule | null;
  }

  static async getAllRules(guildId: string): Promise<ViolationRule[]> {
    const db = getPrisma();
    const rules = await db.violationRule.findMany({
      where: { guildId },
      orderBy: { code: 'asc' },
    });
    return rules as unknown as ViolationRule[];
  }

  static async getEnabledRules(guildId: string): Promise<ViolationRule[]> {
    const db = getPrisma();
    const rules = await db.violationRule.findMany({
      where: { guildId, enabled: true },
      orderBy: { code: 'asc' },
    });
    return rules as unknown as ViolationRule[];
  }

  static async getRulesByCategory(guildId: string, category: string): Promise<ViolationRule[]> {
    const db = getPrisma();
    const rules = await db.violationRule.findMany({
      where: { guildId, category, enabled: true },
      orderBy: { code: 'asc' },
    });
    return rules as unknown as ViolationRule[];
  }

  static async createRule(guildId: string, data: Partial<ViolationRule>, _createdBy: string): Promise<ViolationRule> {
    const db = getPrisma();
    try {
      const rule = await db.violationRule.create({
        data: {
          guildId,
          code: data.code!.toUpperCase(),
          name: data.name!,
          description: data.description,
          category: data.category || 'GENEL',
          enabled: data.enabled ?? true,
          punishmentType: data.punishmentType || 'WARN',
          duration: data.duration,
          points: data.points || 1,
          autoReport: data.autoReport ?? false,
          cooldownMinutes: data.cooldownMinutes || 0,
          maxOccurrences: data.maxOccurrences,
          escalationChainId: data.escalationChainId,
        },
      });
      log.info(`Kural oluşturuldu: ${rule.code} (${guildId})`);
      return rule as unknown as ViolationRule;
    } catch (error) {
      log.error('Kural oluşturma hatası', error);
      throw error;
    }
  }

  static async updateRule(guildId: string, code: string, data: Partial<ViolationRule>): Promise<ViolationRule> {
    const db = getPrisma();
    try {
      const rule = await db.violationRule.update({
        where: { guildId_code: { guildId, code } },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      log.info(`Kural güncellendi: ${rule.code}`);
      return rule as unknown as ViolationRule;
    } catch (error) {
      log.error('Kural güncelleme hatası', error);
      throw error;
    }
  }

  static async deleteRule(guildId: string, code: string): Promise<boolean> {
    const db = getPrisma();
    try {
      await db.violationRule.delete({
        where: { guildId_code: { guildId, code } },
      });
      log.info(`Kural silindi: ${code}`);
      return true;
    } catch (error) {
      log.error('Kural silme hatası', error);
      return false;
    }
  }

  static async toggleRule(guildId: string, code: string): Promise<ViolationRule> {
    const rule = await this.getRule(guildId, code);
    if (!rule) throw new Error('Kural bulunamadı');
    return this.updateRule(guildId, code, { enabled: !rule.enabled });
  }

  static async incrementViolationCount(guildId: string, userId: string, ruleCode: string): Promise<number> {
    const db = getPrisma();
    try {
      const existing = await db.userViolationCount.findUnique({
        where: { guildId_userId_ruleCode: { guildId, userId, ruleCode } },
      });

      if (existing) {
        const updated = await db.userViolationCount.update({
          where: { id: existing.id },
          data: {
            count: { increment: 1 },
            lastOccurrence: new Date(),
          },
        });
        return updated.count;
      } else {
        const created = await db.userViolationCount.create({
          data: {
            guildId,
            userId,
            ruleCode,
            count: 1,
          },
        });
        return created.count;
      }
    } catch (error) {
      log.error('İhlal sayısı artırma hatası', error);
      return 1;
    }
  }

  static async getViolationCount(guildId: string, userId: string, ruleCode: string): Promise<number> {
    const db = getPrisma();
    const record = await db.userViolationCount.findUnique({
      where: { guildId_userId_ruleCode: { guildId, userId, ruleCode } },
    });
    return record?.count || 0;
  }

  static async checkRule(guildId: string, userId: string, ruleCode: string): Promise<RuleCheckResult> {
    const rule = await this.getRule(guildId, ruleCode);
    if (!rule) {
      return { allowed: false, reason: 'Kural bulunamadı.', shouldEscalate: false, currentCount: 0 };
    }

    if (!rule.enabled) {
      return { allowed: false, reason: 'Kural devre dışı.', shouldEscalate: false, currentCount: 0 };
    }

    const currentCount = await this.getViolationCount(guildId, userId, ruleCode);

    // MaxOccurrences kontrolü
    if (rule.maxOccurrences && currentCount >= rule.maxOccurrences) {
      return {
        allowed: false,
        rule,
        reason: `Maksimum ihlal sayısına ulaşıldı (${rule.maxOccurrences}).`,
        shouldEscalate: true,
        currentCount,
      };
    }

    return {
      allowed: true,
      rule,
      shouldEscalate: false,
      currentCount,
    };
  }

  static async initDefaultRules(guildId: string, createdBy: string): Promise<void> {
    for (const ruleData of DEFAULT_RULES) {
      await this.getRule(guildId, ruleData.code).then(async (existing) => {
        if (!existing) {
          await this.createRule(guildId, ruleData, createdBy);
        }
      }).catch(() => null);
    }
    log.info(`Varsayılan kurallar eklendi: ${guildId}`);
  }

  static formatRule(rule: ViolationRule): string {
    const lines: string[] = [
      `**${rule.name}** (\`${rule.code}\`) ${rule.enabled ? '' : ''}`,
      `**Açıklama:** ${rule.description || 'Yok'}`,
      `**Kategori:** ${rule.category}`,
      `**Ceza:** ${rule.punishmentType}${rule.duration ? ` (${rule.duration})` : ''}`,
      `**Puan:** ${rule.points}`,
      `**Cooldown:** ${rule.cooldownMinutes} dakika`,
    ];
    if (rule.maxOccurrences) {
      lines.push(`**Maksimum İhlal:** ${rule.maxOccurrences}`);
    }
    return lines.join('\n');
  }

  static getCategories(): string[] {
    return ['GENEL', 'ICERIK', 'RP', 'GUVENLIK', 'SISTEM'];
  }
}
