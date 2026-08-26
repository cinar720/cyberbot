import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serveremojis',
    description: 'Sunucudaki tüm emojileri gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serveremojis')
    .setDescription('Sunucudaki tüm emojileri gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const emojis = guild.emojis.cache;

    if (emojis.size === 0) {
      await interaction.reply({ embeds: [CyberEmbed.info('Bilgi', 'Sunucuda herhangi bir emoji bulunmuyor.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const animated = emojis.filter((e) => e.animated);
    const staticEmojis = emojis.filter((e) => !e.animated);

    const embed = CyberEmbed.info(`Sunucu Emojileri (${emojis.size})`)
      .addFields(
        { name: 'Özet', value: `Animasyonlu: \`${animated.size}\`\nStatik: \`${staticEmojis.size}\``, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    const chunks: string[] = [];
    let current = '';
    for (const emoji of emojis.values()) {
      const str = `${emoji}`;
      if (current.length + str.length + 1 > 1024) {
        chunks.push(current);
        current = str;
      } else {
        current = current ? current + ' ' + str : str;
      }
    }
    if (current) chunks.push(current);

    chunks.forEach((chunk, index) => {
      embed.addFields({ name: index === 0 ? 'Emojiler' : '\u200b', value: chunk });
    });

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
