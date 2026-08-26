import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'stickerinfo',
    description: 'Sticker hakkında bilgi gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('stickerinfo')
    .setDescription('Sticker hakkında bilgi gösterir.')
    .addStringOption((option) =>
      option.setName('sticker').setDescription('Bilgisi gösterilecek sticker adı').setRequired(true),
    ),

  async execute({ interaction, guild }) {
    if (!guild) return;

    const stickerName = interaction.options.getString('sticker', true);

    const stickers = await guild.stickers.fetch();
    const sticker = stickers.find((s) => s.name === stickerName);

    if (!sticker) {
      await interaction.reply({ content: `"${stickerName}" adında bir sticker bulunamadı.`, flags: [MessageFlags.Ephemeral] });
      return;
    }

    const formatNames: Record<number, string> = {
      1: 'PNG',
      2: 'APNG',
      3: 'LOTTIE',
      4: 'GIF',
    };

    const embed = CyberEmbed.info(`${sticker.name} Sticker Bilgisi`)
      .addFields(
        { name: 'Genel', value: [
          `ID: \`${sticker.id}\``,
          `Ad: \`${sticker.name}\``,
          `Format: \`${formatNames[sticker.format] ?? 'Bilinmiyor'}\``,
          `Açıklama: ${sticker.description || 'Yok'}`,
        ].join('\n'), inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (sticker.url) {
      embed.setImage(sticker.url);
    }

    if (sticker.user) {
      embed.addFields({ name: 'Yükleyen', value: `${sticker.user.tag}`, inline: true });
    }

    if (sticker.tags) {
      embed.addFields({ name: 'Etiket', value: sticker.tags, inline: true });
    }

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
