import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('REASON');

export interface ReasonData {
  code: string;
  label: string;
  description?: string;
  category?: string;
}

export class ReasonService {
  static async create(guildId: string, data: ReasonData, createdBy: string) {
    const db = getPrisma();
    try {
      const reason = await db.reason.create({
        data: {
          guildId,
          code: data.code.toUpperCase(),
          label: data.label,
          description: data.description,
          category: data.category,
          createdBy,
        },
      });
      log.info(`Sebep oluşturuldu: ${reason.code} (${guildId})`);
      return reason;
    } catch (error) {
      log.error('Sebep oluşturma hatası', error);
      throw error;
    }
  }

  static async get(guildId: string, code: string) {
    const db = getPrisma();
    return db.reason.findUnique({
      where: { guildId_code: { guildId, code: code.toUpperCase() } },
    });
  }

  static async getAll(guildId: string) {
    const db = getPrisma();
    return db.reason.findMany({
      where: { guildId, enabled: true },
      orderBy: { code: 'asc' },
    });
  }

  static async getByCategory(guildId: string, category: string) {
    const db = getPrisma();
    return db.reason.findMany({
      where: { guildId, category, enabled: true },
      orderBy: { code: 'asc' },
    });
  }

  static async update(guildId: string, code: string, data: Partial<ReasonData>) {
    const db = getPrisma();
    try {
      const reason = await db.reason.update({
        where: { guildId_code: { guildId, code: code.toUpperCase() } },
        data: {
          ...(data.label && { label: data.label }),
          ...(data.description !== undefined && { description: data.description }),
          ...(data.category !== undefined && { category: data.category }),
        },
      });
      log.info(`Sebep güncellendi: ${reason.code}`);
      return reason;
    } catch (error) {
      log.error('Sebep güncelleme hatası', error);
      throw error;
    }
  }

  static async delete(guildId: string, code: string) {
    const db = getPrisma();
    try {
      await db.reason.delete({
        where: { guildId_code: { guildId, code: code.toUpperCase() } },
      });
      log.info(`Sebep silindi: ${code}`);
      return true;
    } catch (error) {
      log.error('Sebep silme hatası', error);
      return false;
    }
  }

  static async incrementUsage(guildId: string, code: string) {
    const db = getPrisma();
    try {
      await db.reason.update({
        where: { guildId_code: { guildId, code: code.toUpperCase() } },
        data: { usageCount: { increment: 1 } },
      });
    } catch (error) {
      log.error('Sebep kullanım sayısı hatası', error);
    }
  }

  static async getOrCreate(guildId: string, code: string, label: string, createdBy: string) {
    const existing = await this.get(guildId, code);
    if (existing) return existing;
    return this.create(guildId, { code, label }, createdBy);
  }

  static async getDefaultReasons(guildId: string, createdBy: string): Promise<void> {
    const defaults: ReasonData[] = [
      { code: 'HAKARET', label: 'Hakaret', category: 'Genel' },
      { code: 'KUFUR', label: 'Küfür', category: 'Genel' },
      { code: 'SPAM', label: 'Spam', category: 'Genel' },
      { code: 'REKLAM', label: 'Reklam', category: 'Genel' },
      { code: 'TROLL', label: 'Troll', category: 'Genel' },
      { code: 'RDM', label: 'RDM (Random Deathmatch)', category: 'RP' },
      { code: 'VDM', label: 'VDM (Vehicle Deathmatch)', category: 'RP' },
      { code: 'FEARRP', label: 'FearRP', category: 'RP' },
      { code: 'POWERGAMING', label: 'PowerGaming', category: 'RP' },
      { code: 'RP_IHLALI', label: 'RP İhlali', category: 'RP' },
      { code: 'NSFW', label: 'NSFW İçerik', category: 'İçerik' },
      { code: 'DMS', label: 'DM Spam', category: 'Genel' },
      { code: 'ALTK', label: 'Alt Hesap', category: 'Güvenlik' },
      { code: 'AUTOMOD', label: 'Otomatik Moderasyon', category: 'Sistem' },
    ];

    for (const reason of defaults) {
      await this.getOrCreate(guildId, reason.code, reason.label, createdBy).catch(() => null);
    }
    log.info(`Varsayılan sebepler eklendi: ${guildId}`);
  }
}
