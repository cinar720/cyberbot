import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'emojiinfo',
    description: 'Emoji hakkında bilgi gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('emojiinfo')
    .setDescription('Emoji hakkında bilgi gösterir.')
    .addStringOption((option) =>
      option.setName('emoji').setDescription('Bilgi gösterilecek emoji').setRequired(true),
    ),

  async execute({ interaction }) {
    const input = interaction.options.getString('emoji', true);

    const customEmojiMatch = input.match(/<a?:\w+:(\d+)>/);
    if (customEmojiMatch) {
      const emojiId = customEmojiMatch[1];
      if (!emojiId) {
        await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Emoji bulunamadı.')], flags: [MessageFlags.Ephemeral] });
        return;
      }
      const emoji = interaction.client.emojis.cache.get(emojiId);
      if (!emoji) {
        await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Emoji bulunamadı.')], flags: [MessageFlags.Ephemeral] });
        return;
      }

      const embed = CyberEmbed.info(`Emoji Bilgisi: ${emoji.name}`)
        .addFields(
          { name: 'İsim', value: `\`${emoji.name}\``, inline: true },
          { name: 'ID', value: `\`${emoji.id}\``, inline: true },
          { name: 'Sunucu', value: `\`${emoji.guild.name}\``, inline: true },
          { name: 'Oluşturulma', value: `<t:${Math.floor(emoji.createdTimestamp / 1000)}:R>`, inline: true },
          { name: 'URL', value: `[Emoji Linki](${emoji.url})`, inline: true },
          { name: 'Animasyonlu', value: emoji.animated ? 'Evet' : 'Hayır', inline: true },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.reply({ embeds: [embed] });
    } else {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Geçerli bir özel emoji girin. Unicode emojiler desteklenmemektedir.')], flags: [MessageFlags.Ephemeral] });
    }
  },
} satisfies SlashCommand;
