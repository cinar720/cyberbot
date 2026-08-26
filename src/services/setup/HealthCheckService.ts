import { Guild, PermissionsBitField } from 'discord.js';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { ModuleService } from './ModuleService.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('HEALTH');

export interface HealthIssue {
  severity: 'critical' | 'warning' | 'info';
  category: string;
  message: string;
  solution?: string;
}

export interface HealthCheckResult {
  status: 'OK' | 'WARNING' | 'CRITICAL';
  issues: HealthIssue[];
  warnings: HealthIssue[];
  score: number;
  checkedAt: Date;
}

export class HealthCheckService {
  static async check(guild: Guild): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
      status: 'OK',
      issues: [],
      warnings: [],
      score: 100,
      checkedAt: new Date(),
    };

    // 1. Bot izinleri kontrolü
    await this.checkBotPermissions(guild, result);

    // 2. Rol hiyerarşisi kontrolü
    await this.checkRoleHierarchy(guild, result);

    // 3. Log kanalları kontrolü
    await this.checkLogChannels(guild, result);

    // 4. Moderasyon kanalları kontrolü
    await this.checkModerationChannels(guild, result);

    // 5. Modül durumu kontrolü
    await this.checkModules(guild, result);

    // 6. Veritabanı bağlantısı kontrolü
    await this.checkDatabase(result);

    // 7. Emoji kontrolü
    await this.checkEmojis(guild, result);

    // 8. Owner kontrolü
    await this.checkOwner(guild, result);

    // Durum belirle
    if (result.issues.some((i) => i.severity === 'critical')) {
      result.status = 'CRITICAL';
    } else if (result.warnings.length > 0) {
      result.status = 'WARNING';
    }

    // Skor hesapla
    result.score = Math.max(0, 100 - (result.issues.length * 15) - (result.warnings.length * 5));

    // Sonucu kaydet
    await this.saveResult(guild.id, result);

    return result;
  }

  // ==========================================
  // KONTROLLER
  // ==========================================
  private static async checkBotPermissions(guild: Guild, result: HealthCheckResult): Promise<void> {
    const bot = guild.members.me;
    if (!bot) {
      result.issues.push({
        severity: 'critical',
        category: 'Bot İzinleri',
        message: 'Bot sunucuda bulunamadı.',
        solution: 'Botu sunucuya yeniden davet edin.',
      });
      return;
    }

    const requiredPermissions = [
      PermissionsBitField.Flags.Administrator,
    ];

    const missingPermissions: string[] = [];
    for (const perm of requiredPermissions) {
      if (!bot.permissions.has(perm)) {
        missingPermissions.push(String(perm));
      }
    }

    if (missingPermissions.length > 0) {
      result.issues.push({
        severity: 'critical',
        category: 'Bot İzinleri',
        message: `Eksik yetkiler: ${missingPermissions.join(', ')}`,
        solution: 'Botu sunucuya yeniden davet ederek gerekli yetkileri verin.',
      });
    }
  }

  private static async checkRoleHierarchy(guild: Guild, result: HealthCheckResult): Promise<void> {
    const bot = guild.members.me;
    if (!bot) return;

    const modRoles = guild.roles.cache.filter(
      (r) => r.name.toLowerCase().includes('moderator') ||
             r.name.toLowerCase().includes('mod') ||
             r.name.toLowerCase().includes('admin')
    );

    for (const role of modRoles.values()) {
      if (role.position >= bot.roles.highest.position) {
        result.warnings.push({
          severity: 'warning',
          category: 'Rol Hiyerarşisi',
          message: `${role.name} rolü bot rolünden yüksek.`,
          solution: 'Bot rolünü daha yükseğe taşıyın veya modrolünü aşağıya taşıyın.',
        });
      }
    }
  }

  private static async checkLogChannels(guild: Guild, result: HealthCheckResult): Promise<void> {
    const logChannels = ['log-moderasyon', 'log-mesaj', 'log-ses', 'log-kanal', 'log-rol'];

    for (const channelName of logChannels) {
      const channel = guild.channels.cache.find(
        (c) => c.name.toLowerCase() === channelName.toLowerCase()
      );

      if (!channel) {
        result.warnings.push({
          severity: 'warning',
          category: 'Log Kanalları',
          message: `${channelName} kanalı bulunamadı.`,
          solution: `Kurulum sihirbazını çalıştırarak ${channelName} kanalını oluşturun.`,
        });
      }
    }
  }

  private static async checkModerationChannels(guild: Guild, result: HealthCheckResult): Promise<void> {
    const modChannels = ['destek', 'ticket'];

    for (const channelName of modChannels) {
      const channel = guild.channels.cache.find(
        (c) => c.name.toLowerCase() === channelName.toLowerCase()
      );

      if (!channel) {
        result.warnings.push({
          severity: 'info',
          category: 'Moderasyon Kanalları',
          message: `${channelName} kanalı bulunamadı.`,
          solution: `Kurulum sihirbazını çalıştırarak ${channelName} kanalını oluşturun.`,
        });
      }
    }
  }

  private static async checkModules(guild: Guild, result: HealthCheckResult): Promise<void> {
    const modules = await ModuleService.getAll(guild.id);

    for (const module of modules) {
      if (module.enabled && !module.configured) {
        result.warnings.push({
          severity: 'warning',
          category: 'Modüller',
          message: `${module.displayName} aktif ama yapılandırılmamış.`,
          solution: `${module.displayName} modülünü yapılandırın.`,
        });
      }
    }
  }

  private static async checkDatabase(result: HealthCheckResult): Promise<void> {
    try {
      const db = getPrisma();
      await db.$queryRaw`SELECT 1`;
    } catch (error) {
      result.issues.push({
        severity: 'critical',
        category: 'Veritabanı',
        message: 'Veritabanı bağlantısı kurulamadı.',
        solution: 'Veritabanı bağlantısını kontrol edin.',
      });
    }
  }

  private static async checkEmojis(guild: Guild, result: HealthCheckResult): Promise<void> {
    const requiredEmojis = ['basari', 'hata', 'uyari', 'info'];
    const missingEmojis: string[] = [];

    for (const emojiName of requiredEmojis) {
      const emoji = guild.emojis.cache.find(
        (e) => e.name?.toLowerCase() === emojiName.toLowerCase()
      );
      if (!emoji) {
        missingEmojis.push(emojiName);
      }
    }

    if (missingEmojis.length > 0) {
      result.warnings.push({
        severity: 'info',
        category: 'Emojiler',
        message: `Eksik emojiler: ${missingEmojis.join(', ')}`,
        solution: 'Eksik emojileri sunucuya ekleyin.',
      });
    }
  }

  private static async checkOwner(_guild: Guild, result: HealthCheckResult): Promise<void> {
    const { main } = await import('../../config/main.js');
    if (!main.ownerId) {
      result.warnings.push({
        severity: 'warning',
        category: 'Owner',
        message: 'Owner ID yapılandırılmamış.',
        solution: '.env dosyasına OWNER_ID ekleyin.',
      });
    }
  }

  // ==========================================
  // KAYDETME
  // ==========================================
  private static async saveResult(guildId: string, result: HealthCheckResult): Promise<void> {
    const db = getPrisma();
    try {
      await db.healthCheck.create({
        data: {
          guildId,
          status: result.status,
          issues: result.issues as unknown as Prisma.InputJsonValue,
          warnings: result.warnings as unknown as Prisma.InputJsonValue,
        },
      });
    } catch (error) {
      log.error('Health check sonucu kaydetme hatası', error);
    }
  }

  static async getHistory(guildId: string, limit: number = 10) {
    const db = getPrisma();
    return db.healthCheck.findMany({
      where: { guildId },
      orderBy: { checkedAt: 'desc' },
      take: limit,
    });
  }

  // ==========================================
  // FORMAT
  // ==========================================
  static formatResult(result: HealthCheckResult): string {
    const statusEmoji = {
      OK: '',
      WARNING: '',
      CRITICAL: '',
    };

    const lines: string[] = [
      `**Sağlık Kontrolü ${statusEmoji[result.status]}**`,
      `**Skor:** ${result.score}/100`,
      `**Durum:** ${result.status}`,
      '',
    ];

    if (result.issues.length > 0) {
      lines.push('**Kritik Sorunlar:**');
      for (const issue of result.issues) {
        lines.push(`**${issue.category}:** ${issue.message}`);
        if (issue.solution) {
          lines.push(`   Çözüm: ${issue.solution}`);
        }
      }
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('**Uyarılar:**');
      for (const warning of result.warnings) {
        lines.push(`**${warning.category}:** ${warning.message}`);
        if (warning.solution) {
          lines.push(`   Çözüm: ${warning.solution}`);
        }
      }
      lines.push('');
    }

    if (result.issues.length === 0 && result.warnings.length === 0) {
      lines.push('Herhangi bir sorun bulunamadı!');
    }

    return lines.join('\n');
  }
}
