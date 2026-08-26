import { SlashCommandBuilder } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serverboost',
    description: 'Sunucu boost bilgilerini gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serverboost')
    .setDescription('Sunucu boost bilgilerini gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) return;

    await interaction.deferReply();

    const boostCount = guild.premiumSubscriptionCount ?? 0;
    const boostLevel = guild.premiumTier;
    const boosters = guild.members.cache.filter((m) => m.premiumSince !== null);

    const tierNames: Record<number, string> = {
      0: 'Yok',
      1: 'Seviye 1',
      2: 'Seviye 2',
      3: 'Seviye 3',
    };

    const embed = CyberEmbed.info(`${guild.name} Boost Bilgisi`)
      .setThumbnail(guild.iconURL({ size: 512 }) || '')
      .addFields(
        { name: 'Boost Seviyesi', value: `\`${tierNames[boostLevel] ?? 'Bilinmiyor'}\``, inline: true },
        { name: 'Toplam Boost', value: `\`${boostCount}\``, inline: true },
        { name: 'Boostlayan Sayısı', value: `\`${boosters.size}\``, inline: true },
      );

    if (boosters.size > 0) {
      const boosterList = boosters
        .first(20)
        .map((m) => `<@${m.id}>`)
        .join('\n');
      embed.addFields({ name: 'Boostlayanlar', value: boosterList, inline: false });
    }

    embed.setDefaultFooter().setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
