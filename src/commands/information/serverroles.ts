import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serverroles',
    description: 'Sunucudaki tüm rolleri gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serverroles')
    .setDescription('Sunucudaki tüm rolleri gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position);

    if (roles.size === 0) {
      await interaction.reply({ embeds: [CyberEmbed.info('Bilgi', 'Sunucuda herhangi bir rol bulunmuyor.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const roleList = roles.map(
      (role) => `${role} - \`${role.members.size}\` üye`,
    );

    const chunks: string[] = [];
    let current = '';
    for (const line of roleList) {
      if (current.length + line.length + 1 > 1024) {
        chunks.push(current);
        current = line;
      } else {
        current = current ? current + '\n' + line : line;
      }
    }
    if (current) chunks.push(current);

    const embed = CyberEmbed.info(`Sunucu Roller (${roles.size})`)
      .setDefaultFooter()
      .setTimestampNow();

    chunks.forEach((chunk, index) => {
      embed.addFields({ name: index === 0 ? 'Roller' : '\u200b', value: chunk });
    });

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
