import { Events, type Guild } from 'discord.js';
import { markGuildLeft } from '../../services/guild.js';
import { invalidateGuildCache } from '../../services/guildConfig.js';
import { sendBotLog, createEmbed, LogColors } from '../../services/logger/discord.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('GUILD-DELETE');

export default {
  name: Events.GuildDelete,
  once: false,
  async execute(guild: Guild): Promise<void> {
    log.info('Bot sunucudan ayrıldı: %s (%s)', guild.name, guild.id);

    await markGuildLeft(guild.id);
    invalidateGuildCache(guild.id);

    const embed = createEmbed(
      LogColors.WARNING,
      'Bot Sunucudan Ayrıldı',
      [
        `**Sunucu:** ${guild.name}`,
        `**ID:** ${guild.id}`,
        `**Üye Sayısı:** ${guild.memberCount.toLocaleString()}`,
        `**Ayrılış:** <t:${Math.floor(Date.now() / 1000)}:R>`,
      ].join('\n'),
    );

    await sendBotLog(embed).catch(() => null);
  },
};
