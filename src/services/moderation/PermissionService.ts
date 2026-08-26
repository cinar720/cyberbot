import {
  GuildMember,
  PermissionsBitField,
  PermissionResolvable,
} from 'discord.js';
import { main } from '../../config/main.js';
export type StaffLevel = 0 | 1 | 2 | 3 | 4 | 5;

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
}

export class PermissionService {
  static isOwner(userId: string): boolean {
    return userId === main.ownerId;
  }

  static isDeveloper(userId: string): boolean {
    return main.developerIds.includes(userId);
  }

  static isGuildOwner(member: GuildMember): boolean {
    return member.guild.ownerId === member.id;
  }

  static getStaffLevel(member: GuildMember): StaffLevel {
    if (this.isOwner(member.id)) return 5;
    if (this.isGuildOwner(member)) return 5;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return 4;
    if (member.permissions.has(PermissionsBitField.Flags.BanMembers)) return 3;
    if (member.permissions.has(PermissionsBitField.Flags.KickMembers)) return 2;
    if (member.permissions.has(PermissionsBitField.Flags.ModerateMembers)) return 1;
    return 0;
  }

  static canModerate(executor: GuildMember, target: GuildMember): PermissionCheckResult {
    // Owner check
    if (this.isOwner(target.id)) {
      return { allowed: false, reason: 'Bot sahibi moderasyona alınamaz.' };
    }

    // Developer check
    if (this.isDeveloper(target.id)) {
      return { allowed: false, reason: 'Geliştirici moderasyona alınamaz.' };
    }

    // Guild owner check
    if (this.isGuildOwner(target)) {
      return { allowed: false, reason: 'Sunucu sahibi moderasyona alınamaz.' };
    }

    // Self moderation check
    if (executor.id === target.id) {
      return { allowed: false, reason: 'Kendinizi moderasyona alamazsınız.' };
    }

    // Hierarchy check
    if (target.roles.highest.position >= executor.roles.highest.position) {
      return { allowed: false, reason: 'Kendi rolünüzle aynı veya daha yüksek roldeki birini moderasyona alamazsınız.' };
    }

    // Bot permission check
    if (!target.moderatable) {
      return { allowed: false, reason: 'Bu kullanıcıyı moderasyona almaya yetkiniz yok.' };
    }

    return { allowed: true };
  }

  static hasPermission(member: GuildMember, permissions: PermissionResolvable[]): boolean {
    return member.permissions.has(permissions);
  }

  static hasAllPermissions(member: GuildMember, permissions: PermissionResolvable[]): boolean {
    return permissions.every((perm) => member.permissions.has(perm));
  }

  static hasAnyPermission(member: GuildMember, permissions: PermissionResolvable[]): boolean {
    return permissions.some((perm) => member.permissions.has(perm));
  }

  static isAdmin(member: GuildMember): boolean {
    return (
      this.isOwner(member.id) ||
      this.isGuildOwner(member) ||
      member.permissions.has(PermissionsBitField.Flags.Administrator)
    );
  }

  static isModerator(member: GuildMember): boolean {
    return (
      this.isAdmin(member) ||
      member.permissions.has(PermissionsBitField.Flags.ModerateMembers) ||
      member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
      member.permissions.has(PermissionsBitField.Flags.BanMembers)
    );
  }

  static checkBanPermission(executor: GuildMember, target: GuildMember): PermissionCheckResult {
    if (!executor.permissions.has(PermissionsBitField.Flags.BanMembers)) {
      return { allowed: false, reason: 'Ban yetkiniz yok.' };
    }
    return this.canModerate(executor, target);
  }

  static checkKickPermission(executor: GuildMember, target: GuildMember): PermissionCheckResult {
    if (!executor.permissions.has(PermissionsBitField.Flags.KickMembers)) {
      return { allowed: false, reason: 'Kick yetkiniz yok.' };
    }
    return this.canModerate(executor, target);
  }

  static checkMutePermission(executor: GuildMember, target: GuildMember): PermissionCheckResult {
    if (!executor.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return { allowed: false, reason: 'Mute yetkiniz yok.' };
    }
    return this.canModerate(executor, target);
  }

  static checkWarnPermission(executor: GuildMember): PermissionCheckResult {
    if (!executor.permissions.has(PermissionsBitField.Flags.ModerateMembers)) {
      return { allowed: false, reason: 'Uyarı yetkiniz yok.' };
    }
    return { allowed: true };
  }

  static getStaffLevelName(level: StaffLevel): string {
    const names: Record<StaffLevel, string> = {
      0: 'Üye',
      1: 'Moderatör',
      2: 'Moderatör+',
      3: 'Yönetici',
      4: 'Admin',
      5: 'Owner',
    };
    return names[level];
  }
}
