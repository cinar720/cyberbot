import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'servericon',
    description: 'Sunucu simgesini gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('servericon')
    .setDescription('Sunucu simgesini gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const iconURL = guild.iconURL({ size: 1024, extension: 'png' });

    const embed = CyberEmbed.info(`${guild.name} Simgesi`)
      .setImage(iconURL ?? '')
      .setDefaultFooter()
      .setTimestampNow();

    if (iconURL) {
      embed.addFields({ name: 'Bağlantı', value: `[Simgenin Yüksek Çözünürlüklü Hali](${iconURL})` });
    } else {
      embed.setDescription('Bu sunucunun bir simgesi yok.');
    }

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
