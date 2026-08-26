import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'editsay',
    description: 'Bir bot mesajını düzenler.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('editsay')
    .setDescription('Bir bot mesajını düzenler.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Mesajın bulunduğu kanal')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Düzenlenecek mesaj ID').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('content').setDescription('Yeni mesaj içeriği').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const channel = interaction.options.getChannel('channel', true);
    const messageId = interaction.options.getString('messageid', true);
    const content = interaction.options.getString('content', true);

    try {
      const targetChannel = await guild.channels.fetch(channel.id);
      if (!targetChannel || !targetChannel.isTextBased() || !('messages' in targetChannel)) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu kanalda mesaj düzenleme işlemi yapılamaz.')],
        });
        return;
      }

      const message = await targetChannel.messages.fetch(messageId);
      if (!message) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        });
        return;
      }

      if (!message.author.bot) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj bir bota ait değil. Sadece bot mesajları düzenlenebilir.')],
        });
        return;
      }

      await message.edit({ content });

      const embed = CyberEmbed.success(`${emojis.edit} Mesaj Düzenlendi`)
        .addFields(
          { name: 'Mesaj ID', value: messageId, inline: true },
          { name: 'Kanal', value: `${targetChannel}`, inline: true },
          { name: 'Yeni İçerik', value: content.length > 1024 ? content.substring(0, 1021) + '...' : content, inline: false },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesaj düzenlenirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;
