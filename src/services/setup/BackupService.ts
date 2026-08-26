import { Guild } from 'discord.js';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { ModuleService } from './ModuleService.js';
import { GuildPolicyService } from '../policy/GuildPolicyService.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('BACKUP');

export interface BackupData {
  guildId: string;
  guildName: string;
  createdAt: Date;
  channels: Array<{ id: string; name: string; type: string; category?: string }>;
  roles: Array<{ id: string; name: string; color?: string; position: number }>;
  modules: Array<{ name: string; enabled: boolean; configured: boolean; config?: Record<string, unknown> }>;
  policy: Record<string, unknown> | null;
  settings: Record<string, unknown> | null;
}

export interface Backup {
  id: string;
  guildId: string;
  name: string;
  data: unknown;
  createdBy: string;
  createdAt: Date;
}

export class BackupService {
  static async create(guild: Guild, name: string, createdBy: string): Promise<Backup> {
    const data = await this.collectData(guild);

    const db = getPrisma();
    try {
      const backup = await db.configBackup.create({
        data: {
          guildId: guild.id,
          name,
          data: data as unknown as Prisma.InputJsonValue,
          createdBy,
        },
      });
      log.info(`Backup oluşturuldu: ${name} (${guild.id})`);
      return backup as unknown as Backup;
    } catch (error) {
      log.error('Backup oluşturma hatası', error);
      throw error;
    }
  }

  static async getAll(guildId: string): Promise<Backup[]> {
    const db = getPrisma();
    const backups = await db.configBackup.findMany({
      where: { guildId },
      orderBy: { createdAt: 'desc' },
    });
    return backups as unknown as Backup[];
  }

  static async getById(backupId: string): Promise<Backup | null> {
    const db = getPrisma();
    const backup = await db.configBackup.findUnique({
      where: { id: backupId },
    });
    return backup as unknown as Backup | null;
  }

  static async delete(backupId: string): Promise<boolean> {
    const db = getPrisma();
    try {
      await db.configBackup.delete({
        where: { id: backupId },
      });
      log.info(`Backup silindi: ${backupId}`);
      return true;
    } catch (error) {
      log.error('Backup silme hatası', error);
      return false;
    }
  }

  static async restore(guild: Guild, backupId: string): Promise<{ success: boolean; errors: string[] }> {
    const backup = await this.getById(backupId);
    if (!backup) {
      return { success: false, errors: ['Backup bulunamadı.'] };
    }

    const errors: string[] = [];
    const data = backup.data as BackupData;

    // Rolleri geri yükle
    for (const roleData of data.roles) {
      const existing = guild.roles.cache.find((r) => r.name === roleData.name);
      if (!existing) {
        try {
          await guild.roles.create({
            name: roleData.name,
            color: roleData.color ? parseInt(roleData.color.replace('#', ''), 16) : undefined,
          });
        } catch (error) {
          errors.push(`${roleData.name} rolu oluşturulamadı.`);
        }
      }
    }

    // Kanalları geri yükle
    for (const channelData of data.channels) {
      const existing = guild.channels.cache.find((c) => c.name === channelData.name);
      if (!existing) {
        try {
          await guild.channels.create({
            name: channelData.name,
            type: channelData.type === 'text' ? 0 : 2,
          });
        } catch (error) {
          errors.push(`${channelData.name} kanalı oluşturulamadı.`);
        }
      }
    }

    // Policy'yi geri yükle
    if (data.policy) {
      await GuildPolicyService.update(guild.id, data.policy).catch(() => {
        errors.push('Policy geri yüklenemedi.');
      });
    }

    // Modülleri geri yükle
    for (const moduleData of data.modules) {
      const existing = await ModuleService.get(guild.id, moduleData.name);
      if (existing) {
        if (moduleData.enabled !== existing.enabled) {
          if (moduleData.enabled) {
            await ModuleService.enable(guild.id, moduleData.name).catch(() => null);
          } else {
            await ModuleService.disable(guild.id, moduleData.name).catch(() => null);
          }
        }
        if (moduleData.config) {
          await ModuleService.configure(guild.id, moduleData.name, moduleData.config).catch(() => null);
        }
      }
    }

    log.info(`Backup geri yüklendi: ${backup.name}`);
    return { success: errors.length === 0, errors };
  }

  private static async collectData(guild: Guild): Promise<BackupData> {
    // Kanalları topla
    const channels = guild.channels.cache.map((c) => ({
      id: c.id,
      name: c.name,
      type: c.type === 0 ? 'text' : c.type === 2 ? 'voice' : 'other',
      category: c.parent?.name,
    }));

    // Rolleri topla
    const roles = guild.roles.cache
      .filter((r) => r.id !== guild.id)
      .map((r) => ({
        id: r.id,
        name: r.name,
        color: r.hexColor,
        position: r.position,
      }));

    // Modülleri topla
    const modules = await ModuleService.getAll(guild.id);
    const moduleData = modules.map((m) => ({
      name: m.name,
      enabled: m.enabled,
      configured: m.configured,
      config: m.config as Record<string, unknown> | undefined,
    }));

    // Policy'yi topla
    const policy = await GuildPolicyService.get(guild.id);

    return {
      guildId: guild.id,
      guildName: guild.name,
      createdAt: new Date(),
      channels,
      roles,
      modules: moduleData,
      policy: policy as unknown as Record<string, unknown>,
      settings: null,
    };
  }

  static formatBackupList(backups: Backup[]): string {
    if (backups.length === 0) return 'Backup bulunamadı.';

    const lines: string[] = ['**Backup Listesi:**', ''];

    for (const backup of backups) {
      const data = backup.data as BackupData;
      lines.push(
        `**${backup.name}** - <t:${Math.floor(backup.createdAt.getTime() / 1000)}:R>`,
        `   Kanal: ${data.channels.length} | Rol: ${data.roles.length} | Modül: ${data.modules.length}`
      );
    }

    return lines.join('\n');
  }

  static formatBackup(backup: Backup): string {
    const data = backup.data as BackupData;
    const lines: string[] = [
      `**${backup.name}**`,
      `**Sunucu:** ${data.guildName}`,
      `**Tarih:** <t:${Math.floor(backup.createdAt.getTime() / 1000)}:R>`,
      `**Oluşturan:** <@${backup.createdBy}>`,
      '',
      '**İçerik:**',
      `- Kanal: ${data.channels.length}`,
      `- Rol: ${data.roles.length}`,
      `- Modül: ${data.modules.length}`,
      `- Policy: ${data.policy ? 'Var' : 'Yok'}`,
    ];

    return lines.join('\n');
  }
}
