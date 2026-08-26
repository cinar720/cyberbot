import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'pin',
    description: 'Bir mesajı sabitler.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('pin')
    .setDescription('Bir mesajı sabitler.')
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Sabitlenecek mesaj ID').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const messageId = interaction.options.getString('messageid', true);

    await interaction.deferReply();

    try {
      const channel = interaction.channel;
      if (!channel || !('messages' in channel)) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        });
        return;
      }

      const message = await (channel as { messages: { fetch(id: string): Promise<{ pinned: boolean; pin(): Promise<unknown> }> } }).messages.fetch(messageId);
      if (!message) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        });
        return;
      }

      if (message.pinned) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj zaten sabitlenmiş.')],
        });
        return;
      }

      await message.pin();

      const embed = CyberEmbed.success('Mesaj Sabitlendi')
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