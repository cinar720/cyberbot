import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'unpin',
    description: 'Bir mesajın sabitlemesini kaldırır.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('unpin')
    .setDescription('Bir mesajın sabitlemesini kaldırır.')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Sabitlemesi kaldırılacak mesaj ID').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const messageId = interaction.options.getString('messageid', true);

    await interaction.deferReply();

    try {
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || !('messages' in channel)) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        });
        return;
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        });
        return;
      }

      if (!message.pinned) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj zaten sabitlenmemiş.')],
        });
        return;
      }

      await message.unpin();

      const embed = CyberEmbed.success('Mesaj Sabitlemesi Kaldırıldı')
        .addFields(
          { name: 'Mesaj ID', value: messageId, inline: true },
          { name: 'Kanal', value: `${channel}`, inline: true },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı veya botun yetkisi yeterli değil.')],
      });
    }
  },
} satisfies SlashCommand;
