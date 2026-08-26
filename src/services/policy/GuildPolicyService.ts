import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('GUILD_POLICY');

export interface GuildPolicyData {
  maxWarnings?: number;
  maxTimeoutMinutes?: number;
  banPolicy?: string;
  appealEnabled?: boolean;
  evidenceRequired?: boolean;
  dmEnabled?: boolean;
  gamePunishmentsEnabled?: boolean;
  dryRunMode?: boolean;
  escalationEnabled?: boolean;
  cooldownMinutes?: number;
  sameTargetCooldownMinutes?: number;
  autoDeleteEvidence?: boolean;
  notifyOnAppeal?: boolean;
  requireReason?: boolean;
}

export interface GuildPolicy {
  id: string;
  guildId: string;
  maxWarnings: number;
  maxTimeoutMinutes: number;
  banPolicy: string;
  appealEnabled: boolean;
  evidenceRequired: boolean;
  dmEnabled: boolean;
  gamePunishmentsEnabled: boolean;
  dryRunMode: boolean;
  escalationEnabled: boolean;
  cooldownMinutes: number;
  sameTargetCooldownMinutes: number;
  autoDeleteEvidence: boolean;
  notifyOnAppeal: boolean;
  requireReason: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const DEFAULT_POLICY: GuildPolicyData = {
  maxWarnings: 3,
  maxTimeoutMinutes: 40320, // 28 days
  banPolicy: 'STRIKE_3',
  appealEnabled: true,
  evidenceRequired: false,
  dmEnabled: true,
  gamePunishmentsEnabled: false,
  dryRunMode: false,
  escalationEnabled: true,
  cooldownMinutes: 5,
  sameTargetCooldownMinutes: 1,
  autoDeleteEvidence: false,
  notifyOnAppeal: true,
  requireReason: true,
};

export class GuildPolicyService {
  static async get(guildId: string): Promise<GuildPolicy> {
    const db = getPrisma();
    let policy = await db.guildPolicy.findUnique({
      where: { guildId },
    });

    if (!policy) {
      policy = await this.create(guildId, DEFAULT_POLICY);
    }

    return policy as unknown as GuildPolicy;
  }

  static async create(guildId: string, data: GuildPolicyData = {}): Promise<GuildPolicy> {
    const db = getPrisma();
    try {
      const policy = await db.guildPolicy.create({
        data: {
          guildId,
          maxWarnings: data.maxWarnings ?? 3,
          maxTimeoutMinutes: data.maxTimeoutMinutes ?? 40320,
          banPolicy: data.banPolicy ?? 'STRIKE_3',
          appealEnabled: data.appealEnabled ?? true,
          evidenceRequired: data.evidenceRequired ?? false,
          dmEnabled: data.dmEnabled ?? true,
          gamePunishmentsEnabled: data.gamePunishmentsEnabled ?? false,
          dryRunMode: data.dryRunMode ?? false,
          escalationEnabled: data.escalationEnabled ?? true,
          cooldownMinutes: data.cooldownMinutes ?? 5,
          sameTargetCooldownMinutes: data.sameTargetCooldownMinutes ?? 1,
          autoDeleteEvidence: data.autoDeleteEvidence ?? false,
          notifyOnAppeal: data.notifyOnAppeal ?? true,
          requireReason: data.requireReason ?? true,
        },
      });
      log.info(`Guild policy oluşturuldu: ${guildId}`);
      return policy as unknown as GuildPolicy;
    } catch (error) {
      log.error('Guild policy oluşturma hatası', error);
      throw error;
    }
  }

  static async update(guildId: string, data: GuildPolicyData): Promise<GuildPolicy> {
    const db = getPrisma();
    try {
      // Policy varsa güncelle, yoksa oluştur
      const existing = await db.guildPolicy.findUnique({
        where: { guildId },
      });

      if (existing) {
        const policy = await db.guildPolicy.update({
          where: { guildId },
          data: {
            ...data,
            updatedAt: new Date(),
          },
        });
        log.info(`Guild policy güncellendi: ${guildId}`);
        return policy as unknown as GuildPolicy;
      } else {
        return this.create(guildId, data);
      }
    } catch (error) {
      log.error('Guild policy güncelleme hatası', error);
      throw error;
    }
  }

  static async isDryRunMode(guildId: string): Promise<boolean> {
    const policy = await this.get(guildId);
    return policy.dryRunMode;
  }

  static async isEscalationEnabled(guildId: string): Promise<boolean> {
    const policy = await this.get(guildId);
    return policy.escalationEnabled;
  }

  static async isAppealEnabled(guildId: string): Promise<boolean> {
    const policy = await this.get(guildId);
    return policy.appealEnabled;
  }

  static async isEvidenceRequired(guildId: string): Promise<boolean> {
    const policy = await this.get(guildId);
    return policy.evidenceRequired;
  }

  static async isDMEnabled(guildId: string): Promise<boolean> {
    const policy = await this.get(guildId);
    return policy.dmEnabled;
  }

  static async getMaxWarnings(guildId: string): Promise<number> {
    const policy = await this.get(guildId);
    return policy.maxWarnings;
  }

  static async getCooldownMinutes(guildId: string): Promise<number> {
    const policy = await this.get(guildId);
    return policy.cooldownMinutes;
  }

  static async getSameTargetCooldownMinutes(guildId: string): Promise<number> {
    const policy = await this.get(guildId);
    return policy.sameTargetCooldownMinutes;
  }

  static async getBanPolicy(guildId: string): Promise<string> {
    const policy = await this.get(guildId);
    return policy.banPolicy;
  }

  static formatPolicy(policy: GuildPolicy): string {
    const lines: string[] = [
      `**Maksimum Uyarı:** ${policy.maxWarnings}`,
      `**Maksimum Timeout:** ${policy.maxTimeoutMinutes} dakika`,
      `**Ban Politikası:** ${policy.banPolicy}`,
      `**Appeal:** ${policy.appealEnabled ? 'Açık' : 'Kapalı'}`,
      `**Kanıt Zorunlu:** ${policy.evidenceRequired ? 'Evet' : 'Hayır'}`,
      `**DM Bildirimi:** ${policy.dmEnabled ? 'Açık' : 'Kapalı'}`,
      `**Oyun Cezaları:** ${policy.gamePunishmentsEnabled ? 'Aktif' : 'Pasif'}`,
      `**Dry Run:** ${policy.dryRunMode ? 'Aktif' : 'Pasif'}`,
      `**Otomatik Yükseltme:** ${policy.escalationEnabled ? 'Aktif' : 'Pasif'}`,
      `**Cooldown:** ${policy.cooldownMinutes} dakika`,
      `**Aynı Hedef Cooldown:** ${policy.sameTargetCooldownMinutes} dakika`,
    ];
    return lines.join('\n');
  }
}
