import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('MODULE');

export interface ModuleData {
  name: string;
  displayName: string;
  description: string;
  enabled?: boolean;
  configured?: boolean;
  version?: string;
  config?: Record<string, unknown>;
}

export interface Module {
  id: string;
  guildId: string;
  name: string;
  displayName: string;
  description: string | null;
  enabled: boolean;
  configured: boolean;
  version: string;
  lastUpdated: Date;
  config: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export const MODULE_DEFINITIONS: ModuleData[] = [
  {
    name: 'moderation',
    displayName: 'Moderasyon',
    description: 'Ban, kick, mute, warn ve diğer moderasyon araçları.',
    version: '1.0.0',
  },
  {
    name: 'guard',
    displayName: 'Guard',
    description: 'Anti-raid, anti-spam, anti-nuke koruma sistemi.',
    version: '1.0.0',
  },
  {
    name: 'logs',
    displayName: 'Log Sistemi',
    description: 'Mesaj, ses, kanal, rol ve moderasyon logları.',
    version: '1.0.0',
  },
  {
    name: 'welcome',
    displayName: 'Hoşgeldin',
    description: 'Sunucuya katılan/ayrılan üyeler için hoşgeldin mesajları.',
    version: '1.0.0',
  },
  {
    name: 'automod',
    displayName: 'Otomatik Moderasyon',
    description: 'Spam, reklam, küfür otomatik tespit ve ceza.',
    version: '1.0.0',
  },
  {
    name: 'ticket',
    displayName: 'Ticket Sistemi',
    description: 'Destek talebi oluşturma ve yönetme.',
    version: '1.0.0',
  },
  {
    name: 'applications',
    displayName: 'Başvuru Sistemi',
    description: 'Moderatör başvuru yönetimi.',
    version: '1.0.0',
  },
  {
    name: 'giveaway',
    displayName: 'Çekiliş',
    description: 'Hediyeli çekiliş oluşturma ve yönetme.',
    version: '1.0.0',
  },
  {
    name: 'rp',
    displayName: 'RP Sistemi',
    description: 'RolePlay yardımcı araçları.',
    version: '1.0.0',
  },
  {
    name: 'ai',
    displayName: 'AI Entegrasyonu',
    description: 'Yapay zeka destekli özellikler.',
    version: '1.0.0',
  },
];

export class ModuleService {
  static async get(guildId: string, moduleName: string): Promise<Module | null> {
    const db = getPrisma();
    const result = await db.module.findUnique({
      where: { guildId_name: { guildId, name: moduleName } },
    });
    return result as unknown as Module | null;
  }

  static async getAll(guildId: string): Promise<Module[]> {
    const db = getPrisma();
    const results = await db.module.findMany({
      where: { guildId },
      orderBy: { name: 'asc' },
    });
    return results as unknown as Module[];
  }

  static async getEnabled(guildId: string): Promise<Module[]> {
    const db = getPrisma();
    const results = await db.module.findMany({
      where: { guildId, enabled: true },
      orderBy: { name: 'asc' },
    });
    return results as unknown as Module[];
  }

  static async getOrCreate(guildId: string, moduleName: string): Promise<Module> {
    const existing = await this.get(guildId, moduleName);
    if (existing) return existing;

    const definition = MODULE_DEFINITIONS.find((m) => m.name === moduleName);
    if (!definition) {
      throw new Error(`Modül bulunamadı: ${moduleName}`);
    }

    return this.create(guildId, definition);
  }

  static async create(guildId: string, data: ModuleData): Promise<Module> {
    const db = getPrisma();
    try {
      const module = await db.module.create({
        data: {
          guildId,
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          enabled: data.enabled ?? false,
          configured: data.configured ?? false,
          version: data.version ?? '1.0.0',
          config: (data.config as unknown as Prisma.InputJsonValue) || undefined,
        },
      });
      log.info(`Modül oluşturuldu: ${module.name} (${guildId})`);
      return module as unknown as Module;
    } catch (error) {
      log.error('Modül oluşturma hatası', error);
      throw error;
    }
  }

  static async enable(guildId: string, moduleName: string): Promise<Module> {
    const db = getPrisma();
    try {
      const module = await db.module.update({
        where: { guildId_name: { guildId, name: moduleName } },
        data: { enabled: true, updatedAt: new Date() },
      });
      log.info(`Modül aktif edildi: ${moduleName}`);
      return module as unknown as Module;
    } catch (error) {
      log.error('Modül aktif etme hatası', error);
      throw error;
    }
  }

  static async disable(guildId: string, moduleName: string): Promise<Module> {
    const db = getPrisma();
    try {
      const module = await db.module.update({
        where: { guildId_name: { guildId, name: moduleName } },
        data: { enabled: false, updatedAt: new Date() },
      });
      log.info(`Modül devre dışı bırakıldı: ${moduleName}`);
      return module as unknown as Module;
    } catch (error) {
      log.error('Modül devre dışı bırakma hatası', error);
      throw error;
    }
  }

  static async toggle(guildId: string, moduleName: string): Promise<Module> {
    const module = await this.get(guildId, moduleName);
    if (!module) throw new Error('Modül bulunamadı');

    if (module.enabled) {
      return this.disable(guildId, moduleName);
    } else {
      return this.enable(guildId, moduleName);
    }
  }

  static async configure(guildId: string, moduleName: string, config: Record<string, unknown>): Promise<Module> {
    const db = getPrisma();
    try {
      const module = await db.module.update({
        where: { guildId_name: { guildId, name: moduleName } },
        data: {
          config: config as unknown as Prisma.InputJsonValue,
          configured: true,
          updatedAt: new Date(),
        },
      });
      log.info(`Modül yapılandırıldı: ${moduleName}`);
      return module as unknown as Module;
    } catch (error) {
      log.error('Modül yapılandırma hatası', error);
      throw error;
    }
  }

  static async initAll(guildId: string): Promise<void> {
    for (const definition of MODULE_DEFINITIONS) {
      await this.getOrCreate(guildId, definition.name).catch(() => null);
    }
    log.info(`Tüm modüller başlatıldı: ${guildId}`);
  }

  static async getStats(guildId: string) {
    const modules = await this.getAll(guildId);
    return {
      total: modules.length,
      enabled: modules.filter((m) => m.enabled).length,
      configured: modules.filter((m) => m.configured).length,
      disabled: modules.filter((m) => !m.enabled).length,
    };
  }

  static formatModuleList(modules: Module[]): string {
    if (modules.length === 0) return 'Modül bulunamadı.';

    const lines: string[] = ['**Modül Listesi:**', ''];

    for (const module of modules) {
      const status = module.enabled ? '' : '';
      const config = module.configured ? '' : '';
      lines.push(`${status} ${config} **${module.displayName}** v${module.version}`);
    }

    lines.push('');
    lines.push('= Aktif | = Pasif | = Yapılandırılmış | = Yapılandırılmamış');

    return lines.join('\n');
  }

  static formatModule(module: Module): string {
    const lines: string[] = [
      `**${module.displayName}** v${module.version}`,
      `**Durum:** ${module.enabled ? 'Aktif' : 'Pasif'}`,
      `**Yapılandırma:** ${module.configured ? 'Tamamlandı' : 'Eksik'}`,
      `**Açıklama:** ${module.description}`,
      `**Son Güncelleme:** <t:${Math.floor(module.lastUpdated.getTime() / 1000)}:R>`,
    ];

    if (module.config) {
      lines.push('');
      lines.push('**Yapılandırma:**');
      const config = module.config as Record<string, unknown>;
      for (const [key, value] of Object.entries(config)) {
        lines.push(`- ${key}: ${JSON.stringify(value)}`);
      }
    }

    return lines.join('\n');
  }
}
