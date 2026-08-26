import { Guild, GuildMember } from 'discord.js';
import { getPrisma } from '../database/index.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('PUNISHMENT');

export class PunishmentService {
  static async applyTimeout(member: GuildMember, durationMs: number, reason: string): Promise<boolean> {
    try {
      await member.timeout(durationMs, reason);
      log.info(`Timeout uygulandı: ${member.user.tag} (${durationMs}ms)`);
      return true;
    } catch (error) {
      log.error('Timeout hatası', error);
      return false;
    }
  }

  static async removeTimeout(member: GuildMember, reason: string): Promise<boolean> {
    try {
      await member.timeout(null, reason);
      log.info(`Timeout kaldırıldı: ${member.user.tag}`);
      return true;
    } catch (error) {
      log.error('Timeout kaldırma hatası', error);
      return false;
    }
  }

  static async kick(member: GuildMember, reason: string): Promise<boolean> {
    try {
      await member.kick(reason);
      log.info(`Kick uygulandı: ${member.user.tag}`);
      return true;
    } catch (error) {
      log.error('Kick hatası', error);
      return false;
    }
  }

  static async ban(guild: Guild, userId: string, reason: string, deleteDays: number = 0): Promise<boolean> {
    try {
      await guild.members.ban(userId, { reason, deleteMessageDays: deleteDays });
      log.info(`Ban uygulandı: ${userId}`);
      return true;
    } catch (error) {
      log.error('Ban hatası', error);
      return false;
    }
  }

  static async unban(guild: Guild, userId: string, reason: string): Promise<boolean> {
    try {
      await guild.members.unban(userId, reason);
      log.info(`Unban uygulandı: ${userId}`);
      return true;
    } catch (error) {
      log.error('Unban hatası', error);
      return false;
    }
  }

  static async setMuteRole(member: GuildMember, muteRoleId: string): Promise<boolean> {
    try {
      await member.roles.add(muteRoleId);
      log.info(`Mute rolü eklendi: ${member.user.tag}`);
      return true;
    } catch (error) {
      log.error('Mute rolü ekleme hatası', error);
      return false;
    }
  }

  static async removeMuteRole(member: GuildMember, muteRoleId: string): Promise<boolean> {
    try {
      await member.roles.remove(muteRoleId);
      log.info(`Mute rolü kaldırıldı: ${member.user.tag}`);
      return true;
    } catch (error) {
      log.error('Mute rolü kaldırma hatası', error);
      return false;
    }
  }

  static async setJailRole(member: GuildMember, jailRoleId: string): Promise<boolean> {
    try {
      // Tüm rolleri kaldır
      const rolesToRemove = member.roles.cache.filter(
        (r) => r.id !== member.guild.id && r.id !== jailRoleId
      );
      await member.roles.remove(rolesToRemove.map((r) => r.id));

      // Jail rolünü ekle
      await member.roles.add(jailRoleId);
      log.info(`Jail rolü eklendi: ${member.user.tag}`);
      return true;
    } catch (error) {
      log.error('Jail rolü ekleme hatası', error);
      return false;
    }
  }

  static async removeJailRole(member: GuildMember, jailRoleId: string, originalRoleIds: string[]): Promise<boolean> {
    try {
      // Jail rolünü kaldır
      if (jailRoleId && member.roles.cache.has(jailRoleId)) {
        await member.roles.remove(jailRoleId);
      }

      // Orijinal rolleri geri ekle (sadece mevcut ve yönetilebilir olanlar)
      if (originalRoleIds.length > 0) {
        const validRoleIds = originalRoleIds.filter(id => {
          const role = member.guild.roles.cache.get(id);
          return role && role.editable;
        });
        if (validRoleIds.length > 0) {
          await member.roles.add(validRoleIds);
        }
      }

      log.info(`Jail rolü kaldırıldı: ${member.user.tag}`);
      return true;
    } catch (error) {
      log.error('Jail rolü kaldırma hatası', error);
      return false;
    }
  }

  static async getActivePunishments(guildId: string, userId: string) {
    const db = getPrisma();
    return db.punishment.findMany({
      where: {
        guildId,
        userId,
        active: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  static async revokePunishment(punishmentId: string) {
    const db = getPrisma();
    try {
      const punishment = await db.punishment.update({
        where: { id: punishmentId },
        data: {
          active: false,
          revokedAt: new Date(),
        },
      });
      log.info(`Ceza iptal edildi: ${punishment.id}`);
      return punishment;
    } catch (error) {
      log.error('Ceza iptal hatası', error);
      throw error;
    }
  }

  static async cleanupExpiredPunishments(): Promise<number> {
    const db = getPrisma();
    try {
      const now = new Date();
      const result = await db.punishment.updateMany({
        where: {
          active: true,
          expiresAt: { not: null, lt: now },
        },
        data: {
          active: false,
          revokedAt: now,
        },
      });
      if (result.count > 0) {
        log.info(`Süresi dolan cezalar temizlendi: ${result.count}`);
      }
      return result.count;
    } catch (error) {
      log.error('Ceza temizleme hatası', error);
      return 0;
    }
  }
}
