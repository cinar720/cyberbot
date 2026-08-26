import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('PERMISSION_PROFILE');

export interface PermissionProfileData {
  name: string;
  level: number;
  permissions?: string[];
  maxBanDuration?: number;
  maxMuteDuration?: number;
  canBan?: boolean;
  canKick?: boolean;
  canMute?: boolean;
  canWarn?: boolean;
  canJail?: boolean;
  canUnban?: boolean;
  canViewCases?: boolean;
  canManageAppeals?: boolean;
  canManagePolicies?: boolean;
  canViewAuditLog?: boolean;
}

export interface PermissionProfile {
  id: string;
  guildId: string;
  name: string;
  level: number;
  permissions: unknown;
  maxBanDuration: number | null;
  maxMuteDuration: number | null;
  canBan: boolean;
  canKick: boolean;
  canMute: boolean;
  canWarn: boolean;
  canJail: boolean;
  canUnban: boolean;
  canViewCases: boolean;
  canManageAppeals: boolean;
  canManagePolicies: boolean;
  canViewAuditLog: boolean;
}

const DEFAULT_PROFILES: PermissionProfileData[] = [
  {
    name: 'Trial Moderator',
    level: 1,
    canBan: false,
    canKick: false,
    canMute: true,
    canWarn: true,
    canJail: false,
    canUnban: false,
    canViewCases: true,
    canManageAppeals: false,
    canManagePolicies: false,
    canViewAuditLog: false,
    maxMuteDuration: 60, // 1 hour
  },
  {
    name: 'Moderator',
    level: 2,
    canBan: false,
    canKick: true,
    canMute: true,
    canWarn: true,
    canJail: false,
    canUnban: false,
    canViewCases: true,
    canManageAppeals: false,
    canManagePolicies: false,
    canViewAuditLog: true,
    maxMuteDuration: 1440, // 1 day
  },
  {
    name: 'Senior Moderator',
    level: 3,
    canBan: true,
    canKick: true,
    canMute: true,
    canWarn: true,
    canJail: true,
    canUnban: false,
    canViewCases: true,
    canManageAppeals: true,
    canManagePolicies: false,
    canViewAuditLog: true,
    maxBanDuration: 7, // 7 days
    maxMuteDuration: 10080, // 7 days
  },
  {
    name: 'Admin',
    level: 4,
    canBan: true,
    canKick: true,
    canMute: true,
    canWarn: true,
    canJail: true,
    canUnban: true,
    canViewCases: true,
    canManageAppeals: true,
    canManagePolicies: false,
    canViewAuditLog: true,
    maxBanDuration: 30, // 30 days
    maxMuteDuration: 40320, // 28 days
  },
  {
    name: 'Senior Admin',
    level: 5,
    canBan: true,
    canKick: true,
    canMute: true,
    canWarn: true,
    canJail: true,
    canUnban: true,
    canViewCases: true,
    canManageAppeals: true,
    canManagePolicies: true,
    canViewAuditLog: true,
    maxBanDuration: 0, // Permanent
    maxMuteDuration: 0, // Permanent
  },
  {
    name: 'Management',
    level: 6,
    canBan: true,
    canKick: true,
    canMute: true,
    canWarn: true,
    canJail: true,
    canUnban: true,
    canViewCases: true,
    canManageAppeals: true,
    canManagePolicies: true,
    canViewAuditLog: true,
    maxBanDuration: 0,
    maxMuteDuration: 0,
  },
];

export class PermissionProfileService {
  static async getProfile(guildId: string, name: string): Promise<PermissionProfile | null> {
    const db = getPrisma();
    const profile = await db.permissionProfile.findUnique({
      where: { guildId_name: { guildId, name } },
    });
    return profile as unknown as PermissionProfile | null;
  }

  static async getAllProfiles(guildId: string): Promise<PermissionProfile[]> {
    const db = getPrisma();
    const profiles = await db.permissionProfile.findMany({
      where: { guildId },
      orderBy: { level: 'asc' },
    });
    return profiles as unknown as PermissionProfile[];
  }

  static async getProfileByLevel(guildId: string, level: number): Promise<PermissionProfile | null> {
    const db = getPrisma();
    const profiles = await db.permissionProfile.findMany({
      where: { guildId },
      orderBy: { level: 'asc' },
    });
    return (profiles.find((p: PermissionProfile) => p.level === level) || null) as unknown as PermissionProfile | null;
  }

  static async createProfile(guildId: string, data: PermissionProfileData): Promise<PermissionProfile> {
    const db = getPrisma();
    try {
      const profile = await db.permissionProfile.create({
        data: {
          guildId,
          name: data.name,
          level: data.level,
          permissions: data.permissions || [],
          maxBanDuration: data.maxBanDuration,
          maxMuteDuration: data.maxMuteDuration,
          canBan: data.canBan ?? false,
          canKick: data.canKick ?? false,
          canMute: data.canMute ?? false,
          canWarn: data.canWarn ?? false,
          canJail: data.canJail ?? false,
          canUnban: data.canUnban ?? false,
          canViewCases: data.canViewCases ?? true,
          canManageAppeals: data.canManageAppeals ?? false,
          canManagePolicies: data.canManagePolicies ?? false,
          canViewAuditLog: data.canViewAuditLog ?? false,
        },
      });
      log.info(`Permission profile oluşturuldu: ${profile.name} (${guildId})`);
      return profile as unknown as PermissionProfile;
    } catch (error) {
      log.error('Permission profile oluşturma hatası', error);
      throw error;
    }
  }

  static async updateProfile(guildId: string, name: string, data: Partial<PermissionProfileData>): Promise<PermissionProfile> {
    const db = getPrisma();
    try {
      const profile = await db.permissionProfile.update({
        where: { guildId_name: { guildId, name } },
        data: {
          ...data,
          updatedAt: new Date(),
        },
      });
      log.info(`Permission profile güncellendi: ${profile.name}`);
      return profile as unknown as PermissionProfile;
    } catch (error) {
      log.error('Permission profile güncelleme hatası', error);
      throw error;
    }
  }

  static async deleteProfile(guildId: string, name: string): Promise<boolean> {
    const db = getPrisma();
    try {
      await db.permissionProfile.delete({
        where: { guildId_name: { guildId, name } },
      });
      log.info(`Permission profile silindi: ${name}`);
      return true;
    } catch (error) {
      log.error('Permission profile silme hatası', error);
      return false;
    }
  }

  static async initDefaultProfiles(guildId: string): Promise<void> {
    for (const profileData of DEFAULT_PROFILES) {
      await this.getProfile(guildId, profileData.name).then(async (existing) => {
        if (!existing) {
          await this.createProfile(guildId, profileData);
        }
      }).catch(() => null);
    }
    log.info(`Varsayılan profiller eklendi: ${guildId}`);
  }

  static async hasPermission(guildId: string, profileName: string, permission: string): Promise<boolean> {
    const profile = await this.getProfile(guildId, profileName);
    if (!profile) return false;
    return (profile.permissions as string[]).includes(permission) || (profile as unknown as Record<string, unknown>)[permission] === true;
  }

  static canPerformAction(profile: PermissionProfile, action: string): boolean {
    switch (action) {
      case 'BAN': return profile.canBan;
      case 'KICK': return profile.canKick;
      case 'MUTE': return profile.canMute;
      case 'WARN': return profile.canWarn;
      case 'JAIL': return profile.canJail;
      case 'UNBAN': return profile.canUnban;
      case 'VIEW_CASES': return profile.canViewCases;
      case 'MANAGE_APPEALS': return profile.canManageAppeals;
      case 'MANAGE_POLICIES': return profile.canManagePolicies;
      case 'VIEW_AUDIT_LOG': return profile.canViewAuditLog;
      default: return false;
    }
  }

  static getMaxDuration(profile: PermissionProfile, action: string): number | null {
    if (action === 'BAN') return profile.maxBanDuration ?? null;
    if (action === 'MUTE' || action === 'TIMEOUT') return profile.maxMuteDuration ?? null;
    return null;
  }

  static formatProfile(profile: PermissionProfile): string {
    const lines: string[] = [
      `**${profile.name}** (Seviye ${profile.level})`,
      '',
      '**Yetkiler:**',
    ];

    const permissions: string[] = [];
    if (profile.canBan) permissions.push('Ban');
    if (profile.canKick) permissions.push('Kick');
    if (profile.canMute) permissions.push('Mute');
    if (profile.canWarn) permissions.push('Warn');
    if (profile.canJail) permissions.push('Jail');
    if (profile.canUnban) permissions.push('Unban');
    if (profile.canViewCases) permissions.push('Case Görüntüleme');
    if (profile.canManageAppeals) permissions.push('Appeal Yönetimi');
    if (profile.canManagePolicies) permissions.push('Policy Yönetimi');
    if (profile.canViewAuditLog) permissions.push('Audit Log Görüntüleme');

    lines.push(permissions.length > 0 ? permissions.join(', ') : 'Yok');

    if (profile.maxBanDuration) {
      lines.push(`**Maks Ban:** ${profile.maxBanDuration} gün`);
    }
    if (profile.maxMuteDuration) {
      lines.push(`**Maks Mute:** ${profile.maxMuteDuration} dakika`);
    }

    return lines.join('\n');
  }
}
