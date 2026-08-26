import {
  Guild,
  GuildMember,
  ChannelType,
  CategoryChannel,
} from 'discord.js';
import { Prisma } from '@prisma/client';
import { getPrisma } from '../database/index.js';
import { ModuleService } from './ModuleService.js';
import { GuildPolicyService } from '../policy/GuildPolicyService.js';
import { EscalationService } from '../policy/EscalationService.js';
import { PermissionProfileService } from '../policy/PermissionProfileService.js';
import { RuleEngine } from '../policy/RuleEngine.js';
import { Logger } from '../../utils/logger.js';
import { emojis } from '../../config/emojis.js';

const log = new Logger('SETUP');

export interface SetupItem {
  type: 'channel' | 'role' | 'category' | 'config';
  name: string;
  action: 'create' | 'update' | 'skip';
  reason?: string;
  id?: string;
}

export interface SetupResult {
  success: boolean;
  profile: string;
  itemsCreated: SetupItem[];
  itemsSkipped: SetupItem[];
  errors: string[];
  completedAt: Date;
}

export interface SetupPreview {
  channels: Array<{ name: string; type: string; category?: string }>;
  roles: Array<{ name: string; color?: string; permissions: string[] }>;
  configs: Array<{ name: string; value: string }>;
  warnings: string[];
}

export class SetupService {
  // ==========================================
  // SETUP WIZARD
  // ==========================================
  static async preview(guild: Guild, profile: string): Promise<SetupPreview> {
    const preview: SetupPreview = {
      channels: [],
      roles: [],
      configs: [],
      warnings: [],
    };

    // Profil bazlı kanallar
    const channelStructure = this.getChannelStructure(profile);
    preview.channels = channelStructure;

    // Profil bazlı roller
    const roleStructure = this.getRoleStructure(profile);
    preview.roles = roleStructure;

    // Eksik kanalları kontrol et
    for (const ch of preview.channels) {
      const existing = guild.channels.cache.find(
        (c) => c.name.toLowerCase() === ch.name.toLowerCase()
      );
      if (existing) {
        preview.warnings.push(`${ch.name} kanalı zaten mevcut.`);
      }
    }

    // Eksik rolleri kontrol et
    for (const role of preview.roles) {
      const existing = guild.roles.cache.find(
        (r) => r.name.toLowerCase() === role.name.toLowerCase()
      );
      if (existing) {
        preview.warnings.push(`${role.name} rolu zaten mevcut.`);
      }
    }

    return preview;
  }

  static async execute(
    guild: Guild,
    member: GuildMember,
    profile: string
  ): Promise<SetupResult> {
    const result: SetupResult = {
      success: true,
      profile,
      itemsCreated: [],
      itemsSkipped: [],
      errors: [],
      completedAt: new Date(),
    };

    try {
      // 1. Modülleri başlat
      await ModuleService.initAll(guild.id);

      // 2. Policy'yi cấulandır
      await this.setupPolicy(guild.id, profile);

      // 3. Kanalları oluştur
      await this.createChannels(guild, profile, result);

      // 4. Rolleri oluştur
      await this.createRoles(guild, profile, result);

      // 5. Varsayılan sebepleri ekle
      const { ReasonService } = await import('../moderation/ReasonService.js');
      await ReasonService.getDefaultReasons(guild.id, member.id);

      // 6. Varsayılan kuralları ekle
      await RuleEngine.initDefaultRules(guild.id, member.id);

      // 7. Varsayılan profilleri ekle
      await PermissionProfileService.initDefaultProfiles(guild.id);

      // 8. Setup geçmişini kaydet
      await this.saveHistory(guild.id, member.id, profile, result);

      log.info(`Kurulum tamamlandı: ${guild.name} (${profile})`);
    } catch (error) {
      result.success = false;
      result.errors.push(`Kurulum hatası: ${error}`);
      log.error('Kurulum hatası', error);
    }

    return result;
  }

  // ==========================================
  // POLICY KURULUMU
  // ==========================================
  private static async setupPolicy(guildId: string, profile: string): Promise<void> {
    const policy = this.getPolicyConfig(profile);
    await GuildPolicyService.update(guildId, policy);

    // Escalation chain oluştur
    const { main } = await import('../../config/main.js');
    await EscalationService.getOrCreateChain(guildId, main.ownerId || 'system');
  }

  private static getPolicyConfig(profile: string): Record<string, unknown> {
    const configs: Record<string, Record<string, unknown>> = {
      basic: {
        maxWarnings: 3,
        banPolicy: 'STRIKE_3',
        appealEnabled: true,
        evidenceRequired: false,
        dmEnabled: true,
        dryRunMode: false,
        escalationEnabled: true,
        cooldownMinutes: 5,
      },
      community: {
        maxWarnings: 5,
        banPolicy: 'STRIKE_5',
        appealEnabled: true,
        evidenceRequired: false,
        dmEnabled: true,
        dryRunMode: false,
        escalationEnabled: true,
        cooldownMinutes: 3,
      },
      gaming: {
        maxWarnings: 3,
        banPolicy: 'STRIKE_3',
        appealEnabled: true,
        evidenceRequired: true,
        dmEnabled: true,
        dryRunMode: false,
        escalationEnabled: true,
        cooldownMinutes: 5,
        gamePunishmentsEnabled: true,
      },
      roleplay: {
        maxWarnings: 5,
        banPolicy: 'STRIKE_5',
        appealEnabled: true,
        evidenceRequired: true,
        dmEnabled: true,
        dryRunMode: false,
        escalationEnabled: true,
        cooldownMinutes: 10,
        gamePunishmentsEnabled: true,
      },
      large: {
        maxWarnings: 3,
        banPolicy: 'STRIKE_3',
        appealEnabled: true,
        evidenceRequired: true,
        dmEnabled: true,
        dryRunMode: false,
        escalationEnabled: true,
        cooldownMinutes: 2,
      },
    };

    return configs[profile] ?? configs.basic ?? {};
  }

  // ==========================================
  // KANAL KURULUMU
  // ==========================================
  private static async createChannels(
    guild: Guild,
    profile: string,
    result: SetupResult
  ): Promise<void> {
    const structure = this.getChannelStructure(profile);

    // Önce kategorileri oluştur
    const categories = [...new Set(structure.filter((c) => c.category).map((c) => c.category))];
    const categoryMap: Record<string, CategoryChannel> = {};

    for (const catName of categories) {
      if (!catName) continue;
      const existing = guild.channels.cache.find(
        (c) => c.type === ChannelType.GuildCategory && c.name.toLowerCase() === catName.toLowerCase()
      );

      if (existing) {
        result.itemsSkipped.push({
          type: 'category',
          name: catName,
          action: 'skip',
          reason: 'Zaten mevcut',
          id: existing.id,
        });
        categoryMap[catName] = existing as CategoryChannel;
      } else {
        try {
          const category = await guild.channels.create({
            name: catName,
            type: ChannelType.GuildCategory,
          });
          result.itemsCreated.push({
            type: 'category',
            name: catName,
            action: 'create',
            id: category.id,
          });
          categoryMap[catName] = category;
        } catch (error) {
          result.errors.push(`${catName} kategorisi oluşturulamadı.`);
        }
      }
    }

    // Sonra kanalları oluştur
    for (const ch of structure) {
      const existing = guild.channels.cache.find(
        (c) => c.name.toLowerCase() === ch.name.toLowerCase()
      );

      if (existing) {
        result.itemsSkipped.push({
          type: 'channel',
          name: ch.name,
          action: 'skip',
          reason: 'Zaten mevcut',
          id: existing.id,
        });
        continue;
      }

      try {
        const parent = ch.category ? categoryMap[ch.category] : undefined;
        const channel = await guild.channels.create({
          name: ch.name,
          type: ch.type === 'text' ? ChannelType.GuildText : ChannelType.GuildVoice,
          parent: parent?.id,
        });

        result.itemsCreated.push({
          type: 'channel',
          name: ch.name,
          action: 'create',
          id: channel.id,
        });
      } catch (error) {
        result.errors.push(`${ch.name} kanalı oluşturulamadı.`);
      }
    }
  }

  private static getChannelStructure(profile: string): Array<{ name: string; type: string; category?: string }> {
    const structures: Record<string, Array<{ name: string; type: string; category?: string }>> = {
      basic: [
        { name: 'genel', type: 'text' },
        { name: 'sohbet', type: 'text' },
        { name: 'kurallar', type: 'text' },
        { name: 'duyurular', type: 'text' },
      ],
      community: [
        { name: 'genel', type: 'text', category: 'Genel' },
        { name: 'sohbet', type: 'text', category: 'Genel' },
        { name: 'medya', type: 'text', category: 'Genel' },
        { name: 'kurallar', type: 'text', category: 'Bilgi' },
        { name: 'duyurular', type: 'text', category: 'Bilgi' },
        { name: 'sıkça-sorulan', type: 'text', category: 'Bilgi' },
        { name: 'destek', type: 'text', category: 'Destek' },
      ],
      gaming: [
        { name: 'genel', type: 'text', category: 'Genel' },
        { name: 'oyun-tartışma', type: 'text', category: 'Oyun' },
        { name: 'lfg', type: 'text', category: 'Oyun' },
        { name: 'skor-tablosu', type: 'text', category: 'Oyun' },
        { name: 'clips', type: 'text', category: 'Medya' },
        { name: 'screenshots', type: 'text', category: 'Medya' },
      ],
      roleplay: [
        { name: 'genel', type: 'text', category: 'Genel' },
        { name: 'rp-sohbet', type: 'text', category: 'RP' },
        { name: 'rp-karakterler', type: 'text', category: 'RP' },
        { name: 'rp-olaylar', type: 'text', category: 'RP' },
        { name: 'rp-kurallar', type: 'text', category: 'RP' },
        { name: 'destek', type: 'text', category: 'Destek' },
      ],
      large: [
        { name: 'genel', type: 'text', category: 'Genel' },
        { name: 'duyurular', type: 'text', category: 'Bilgi' },
        { name: 'kurallar', type: 'text', category: 'Bilgi' },
        { name: 'destek', type: 'text', category: 'Destek' },
        { name: 'ticket-oluştur', type: 'text', category: 'Ticket' },
        { name: 'log-moderasyon', type: 'text', category: 'Loglar' },
        { name: 'log-mesaj', type: 'text', category: 'Loglar' },
        { name: 'log-ses', type: 'text', category: 'Loglar' },
      ],
    };

    return structures[profile] ?? structures.basic ?? [];
  }

  // ==========================================
  // ROL KURULUMU
  // ==========================================
  private static async createRoles(
    guild: Guild,
    profile: string,
    result: SetupResult
  ): Promise<void> {
    const structure = this.getRoleStructure(profile);

    for (const roleData of structure) {
      const existing = guild.roles.cache.find(
        (r) => r.name.toLowerCase() === roleData.name.toLowerCase()
      );

      if (existing) {
        result.itemsSkipped.push({
          type: 'role',
          name: roleData.name,
          action: 'skip',
          reason: 'Zaten mevcut',
          id: existing.id,
        });
        continue;
      }

      try {
        const role = await guild.roles.create({
          name: roleData.name,
          color: roleData.color ? parseInt(roleData.color.replace('#', ''), 16) : undefined,
          mentionable: false,
        });

        result.itemsCreated.push({
          type: 'role',
          name: roleData.name,
          action: 'create',
          id: role.id,
        });
      } catch (error) {
        result.errors.push(`${roleData.name} rolu oluşturulamadı.`);
      }
    }
  }

  private static getRoleStructure(profile: string): Array<{ name: string; color?: string; permissions: string[] }> {
    const structures: Record<string, Array<{ name: string; color?: string; permissions: string[] }>> = {
      basic: [
        { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
        { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
      ],
      community: [
        { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
        { name: 'Yönetici', color: '#ff4400', permissions: ['BanMembers', 'ManageMessages'] },
        { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
        { name: 'VIP', color: '#ffd700', permissions: [] },
      ],
      gaming: [
        { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
        { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
        { name: 'Oyuncu', color: '#00ff00', permissions: [] },
        { name: 'VIP', color: '#ffd700', permissions: [] },
      ],
      roleplay: [
        { name: 'Moderatör', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
        { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
        { name: 'RP Lideri', color: '#9900ff', permissions: [] },
        { name: 'RP Üye', color: '#0099ff', permissions: [] },
      ],
      large: [
        { name: 'Trial Moderator', color: '#ffaa00', permissions: ['ModerateMembers'] },
        { name: 'Moderator', color: '#ff6600', permissions: ['KickMembers', 'ModerateMembers'] },
        { name: 'Senior Moderator', color: '#ff4400', permissions: ['BanMembers', 'ModerateMembers'] },
        { name: 'Admin', color: '#ff0000', permissions: ['Administrator'] },
        { name: 'Management', color: '#9900ff', permissions: ['Administrator'] },
      ],
    };

    return structures[profile] ?? structures.basic ?? [];
  }

  // ==========================================
  // GEÇMİŞ
  // ==========================================
  private static async saveHistory(
    guildId: string,
    userId: string,
    profile: string,
    result: SetupResult
  ): Promise<void> {
    const db = getPrisma();
    try {
      await db.setupHistory.create({
        data: {
          guildId,
          userId,
          profile,
          status: result.success ? 'COMPLETED' : 'FAILED',
          itemsCreated: result.itemsCreated as unknown as Prisma.InputJsonValue,
          itemsSkipped: result.itemsSkipped as unknown as Prisma.InputJsonValue,
          errors: result.errors as unknown as Prisma.InputJsonValue,
          completedAt: result.completedAt,
        },
      });
    } catch (error) {
      log.error('Setup geçmişi kaydetme hatası', error);
    }
  }

  static async getHistory(guildId: string, limit: number = 10) {
    const db = getPrisma();
    return db.setupHistory.findMany({
      where: { guildId },
      orderBy: { startedAt: 'desc' },
      take: limit,
    });
  }

  // ==========================================
  // YARDIMCI
  // ==========================================
  static getProfiles(): Array<{ name: string; displayName: string; description: string }> {
    return [
      { name: 'basic', displayName: 'Temel', description: 'Basit sunucu yapısı.' },
      { name: 'community', displayName: 'Topluluk', description: 'Topluluk odaklı sunucu.' },
      { name: 'gaming', displayName: 'Oyun', description: 'Oyun odaklı sunucu.' },
      { name: 'roleplay', displayName: 'RolePlay', description: 'RP odaklı sunucu.' },
      { name: 'large', displayName: 'Büyük Topluluk', description: 'Profesyonel büyük sunucu.' },
    ];
  }

  static formatPreview(preview: SetupPreview): string {
    const lines: string[] = ['**Kurulum Önizleme:**', ''];

    if (preview.channels.length > 0) {
      lines.push('**Oluşturulacak Kanallar:**');
      for (const ch of preview.channels) {
        const exists = preview.warnings.some((w) => w.includes(ch.name));
        lines.push(`${exists ? emojis.warning : emojis.check} ${ch.name} (${ch.type})`);
      }
      lines.push('');
    }

    if (preview.roles.length > 0) {
      lines.push('**Oluşturulacak Roller:**');
      for (const role of preview.roles) {
        const exists = preview.warnings.some((w) => w.includes(role.name));
        lines.push(`${exists ? emojis.warning : emojis.check} ${role.name}`);
      }
      lines.push('');
    }

    if (preview.warnings.length > 0) {
      lines.push('**Uyarılar:**');
      for (const warning of preview.warnings) {
        lines.push(`${emojis.warning} ${warning}`);
      }
    }

    return lines.join('\n');
  }

  static formatResult(result: SetupResult): string {
    const lines: string[] = [
      `**Kurulum ${result.success ? 'Başarılı' : 'Başarısız'}**`,
      `**Profil:** ${result.profile}`,
      '',
      `**Oluşturulan:** ${result.itemsCreated.length}`,
      `**Atlanan:** ${result.itemsSkipped.length}`,
      `**Hata:** ${result.errors.length}`,
    ];

    if (result.errors.length > 0) {
      lines.push('');
      lines.push('**Hatalar:**');
      for (const error of result.errors) {
        lines.push(`${emojis.error} ${error}`);
      }
    }

    return lines.join('\n');
  }
}
