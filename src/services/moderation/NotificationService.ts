import { User, Client } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { Logger } from '../../utils/logger.js';

const log = new Logger('NOTIFICATION');

export interface NotificationData {
  user: User;
  client: Client;
  type: 'BAN' | 'KICK' | 'MUTE' | 'UNMUTE' | 'WARN' | 'TIMEOUT' | 'UNTIMEOUT' | 'JAIL' | 'UNJAIL' | 'UNBAN';
  caseNumber: number;
  reason: string;
  duration?: string;
  guildName: string;
  moderatorTag: string;
}

export class NotificationService {
  static async sendDM(data: NotificationData): Promise<boolean> {
    try {
      const embed = this.createDMEmbed(data);
      await data.user.send({ embeds: [embed] });
      log.info(`DM gönderildi: ${data.user.tag} (${data.type})`);
      return true;
    } catch (error) {
      log.warn(`DM gönderilemedi: ${data.user.tag} (DM kapalı olabilir)`);
      return false;
    }
  }

  static createDMEmbed(data: NotificationData) {
    const emojis: Record<string, string> = {
      BAN: '',
      KICK: '',
      MUTE: '',
      UNMUTE: '',
      WARN: '',
      TIMEOUT: '',
      UNTIMEOUT: '',
      JAIL: '',
      UNJAIL: '',
      UNBAN: '',
    };

    const titles: Record<string, string> = {
      BAN: 'Sunucudan Yasaklandınız',
      KICK: 'Sunucudan Atıldınız',
      MUTE: 'Susturuldunuz',
      UNMUTE: 'Susturmanız Kaldırıldı',
      WARN: 'Uyarıldınız',
      TIMEOUT: 'Zaman Aşımına Uğradınız',
      UNTIMEOUT: 'Zaman Aşımı Kaldırıldı',
      JAIL: 'Hapse Atıldınız',
      UNJAIL: 'Hapisten Çıkarıldınız',
      UNBAN: 'Yasağınız Kaldırıldı',
    };

    const colors: Record<string, number> = {
      BAN: 0xff0000,
      KICK: 0xff6600,
      MUTE: 0xffcc00,
      UNMUTE: 0x00ff00,
      WARN: 0xffaa00,
      TIMEOUT: 0xffcc00,
      UNTIMEOUT: 0x00ff00,
      JAIL: 0x990000,
      UNJAIL: 0x00ff00,
      UNBAN: 0x00ff00,
    };

    const embed = CyberEmbed.neutral(emojis[data.type] + ' ' + titles[data.type])
      .setDescription(`**${data.guildName}** sunucusunda bir moderasyon işlemi uygulandı.`)
      .addFields(
        { name: 'Case', value: `#${String(data.caseNumber).padStart(6, '0')}`, inline: true },
        { name: 'Sebep', value: data.reason, inline: true },
      )
      .setColor(colors[data.type] ?? 0x0099ff)
      .setFooter({ text: 'CyberBOT Moderasyon Sistemi' })
      .setTimestamp();

    if (data.duration) {
      embed.addFields({ name: 'Süre', value: data.duration, inline: true });
    }

    embed.addFields({ name: 'Moderatör', value: data.moderatorTag, inline: true });

    return embed;
  }

  static async sendBatchDM(users: NotificationData[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const data of users) {
      const success = await this.sendDM(data);
      if (success) sent++;
      else failed++;
    }

    return { sent, failed };
  }

  static async notifyGuild(
    client: Client,
    guildId: string,
    channelId: string,
    data: NotificationData
  ): Promise<boolean> {
    try {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) return false;

      const channel = guild.channels.cache.get(channelId);
      if (!channel || !('send' in channel)) return false;

      const embed = this.createGuildEmbed(data);
      await channel.send({ embeds: [embed] });
      return true;
    } catch (error) {
      log.error('Guild bildirim hatası', error);
      return false;
    }
  }

  static createGuildEmbed(data: NotificationData) {
    const embed = CyberEmbed.info(`Moderasyon İşlemi: ${data.type}`)
      .addFields(
        { name: 'Kullanıcı', value: `${data.user.tag} (${data.user.id})`, inline: true },
        { name: 'Sebep', value: data.reason, inline: true },
        { name: 'Moderatör', value: data.moderatorTag, inline: true },
      )
      .setThumbnail(data.user.displayAvatarURL())
      .setTimestamp();

    if (data.duration) {
      embed.addFields({ name: 'Süre', value: data.duration, inline: true });
    }

    return embed;
  }
}
