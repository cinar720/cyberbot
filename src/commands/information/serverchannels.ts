import { SlashCommandBuilder, ChannelType, MessageFlags, type GuildChannel } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serverchannels',
    description: 'Sunucudaki tüm kanalları gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serverchannels')
    .setDescription('Sunucudaki tüm kanalları gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const categories = guild.channels.cache
      .filter((ch) => ch.type === ChannelType.GuildCategory)
      .sort((a, b) => (a as GuildChannel).position - (b as GuildChannel).position);

    const embed = CyberEmbed.info(`Sunucu Kanalları (${guild.channels.cache.filter((ch) => ch.type !== ChannelType.GuildCategory).size})`)
      .setDefaultFooter()
      .setTimestampNow();

    for (const category of categories.values()) {
      const channels = guild.channels.cache
        .filter((ch) => ch.parentId === category.id)
        .sort((a, b) => (a as GuildChannel).position - (b as GuildChannel).position);

      if (channels.size === 0) continue;

      const channelList = channels.map((ch) => `<#${ch.id}>`).join(', ');
      embed.addFields({ name: `${category.name} (${channels.size})`, value: channelList.length > 1024 ? channelList.slice(0, 1021) + '...' : channelList });
    }

    const uncategorized = guild.channels.cache
      .filter((ch) => !ch.parentId && ch.type !== ChannelType.GuildCategory)
      .sort((a, b) => (a as GuildChannel).position - (b as GuildChannel).position);

    if (uncategorized.size > 0) {
      const channelList = uncategorized.map((ch) => `<#${ch.id}>`).join(', ');
      embed.addFields({ name: `Kategorisiz (${uncategorized.size})`, value: channelList.length > 1024 ? channelList.slice(0, 1021) + '...' : channelList });
    }

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
