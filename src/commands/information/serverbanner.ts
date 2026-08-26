import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serverbanner',
    description: 'Sunucu banner\'ını gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serverbanner')
    .setDescription('Sunucu banner\'ını gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const bannerURL = guild.bannerURL({ size: 1024, extension: 'png' });

    const embed = CyberEmbed.info(`${guild.name} Banner'ı`)
      .setImage(bannerURL ?? '')
      .setDefaultFooter()
      .setTimestampNow();

    if (bannerURL) {
      embed.addFields({ name: 'Baglantı', value: `[Banner'ın Yüksek Çözünürlüklü Hali](${bannerURL})` });
    } else {
      embed.setDescription('Bu sunucunun bir banner\'ı yok.');
    }

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
