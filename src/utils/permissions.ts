import {
  PermissionResolvable,
  GuildMember,
  PermissionsBitField,
  Message,
} from 'discord.js';
import { main } from '../config/main.js';
export class PermissionManager {
  static isOwner(userId: string): boolean {
    return userId === main.ownerId;
  }

  static isDeveloper(userId: string): boolean {
    return main.developerIds.includes(userId);
  }

  static isGuildOwner(member: GuildMember): boolean {
    return member.guild.ownerId === member.id;
  }

  static hasPermission(
    member: GuildMember,
    permissions: PermissionResolvable[],
  ): boolean {
    return member.permissions.has(permissions);
  }

  static hasAllPermissions(
    member: GuildMember,
    permissions: PermissionResolvable[],
  ): boolean {
    return permissions.every((perm) => member.permissions.has(perm));
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
      member.permissions.has(PermissionsBitField.Flags.ManageMessages) ||
      member.permissions.has(PermissionsBitField.Flags.KickMembers) ||
      member.permissions.has(PermissionsBitField.Flags.BanMembers) ||
      member.permissions.has(PermissionsBitField.Flags.ModerateMembers)
    );
  }

  static hasAnyPermission(
    member: GuildMember,
    permissions: PermissionResolvable[],
  ): boolean {
    return permissions.some((perm) => member.permissions.has(perm));
  }

  static getStaffLevel(member: GuildMember): number {
    if (this.isOwner(member.id)) return 5;
    if (this.isGuildOwner(member)) return 5;
    if (member.permissions.has(PermissionsBitField.Flags.Administrator)) return 4;
    if (member.permissions.has(PermissionsBitField.Flags.BanMembers)) return 3;
    if (member.permissions.has(PermissionsBitField.Flags.KickMembers)) return 2;
    if (member.permissions.has(PermissionsBitField.Flags.ManageMessages)) return 1;
    return 0;
  }

  static checkCommandPermissions(
    message: Message,
    options: {
      ownerOnly?: boolean;
      developerOnly?: boolean;
      guildOnly?: boolean;
      permissions?: PermissionResolvable[];
      botPermissions?: PermissionResolvable[];
    },
  ): { allowed: boolean; reason?: string } {
    if (options.ownerOnly && !this.isOwner(message.author.id)) {
      return { allowed: false, reason: 'ownerOnly' };
    }

    if (options.developerOnly && !this.isDeveloper(message.author.id)) {
      return { allowed: false, reason: 'developerOnly' };
    }

    if (options.guildOnly && !message.guild) {
      return { allowed: false, reason: 'guildOnly' };
    }

    if (options.permissions && options.permissions.length > 0 && message.member) {
      if (!this.hasAllPermissions(message.member as GuildMember, options.permissions)) {
        return { allowed: false, reason: 'noPermission' };
      }
    }

    if (options.botPermissions && options.botPermissions.length > 0 && message.guild) {
      const botMember = message.guild.members.me;
      if (botMember && !this.hasAllPermissions(botMember, options.botPermissions)) {
        return { allowed: false, reason: 'botNoPermission' };
      }
    }

    return { allowed: true };
  }
}
