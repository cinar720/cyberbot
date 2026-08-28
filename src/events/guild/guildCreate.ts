import { Events, type Guild } from 'discord.js';
import { ensureGuildConfig } from '../../services/guildConfig.js';
import { sendBotLog, createEmbed, LogColors } from '../../services/logger/discord.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('GUILD-CREATE');

export default {
  name: Events.GuildCreate,
  once: false,
  async execute(guild: Guild): Promise<void> {
    log.info('Bot sunucuya katıldı: %s (%s)', guild.name, guild.id);

    await ensureGuildConfig(guild.id, guild.name, guild.memberCount, guild.ownerId);

    const embed = createEmbed(
      LogColors.SUCCESS,
      'Bot Sunucuya Katıldı',
      [
        `**Sunucu:** ${guild.name}`,
        `**ID:** ${guild.id}`,
        `**Üye Sayısı:** ${guild.memberCount.toLocaleString()}`,
        `**Sahip:** <@${guild.ownerId}>`,
        `**Katılım:** <t:${Math.floor(Date.now() / 1000)}:R>`,
      ].join('\n'),
    );

    await sendBotLog(embed).catch(() => null);
  },
};
