import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, EmbedBuilder } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'editembed',
    description: 'Bir embed mesajını düzenler.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('editembed')
    .setDescription('Bir embed mesajını düzenler.')
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
      option.setName('title').setDescription('Yeni başlık').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('description').setDescription('Yeni açıklama').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const channel = interaction.options.getChannel('channel', true);
    const messageId = interaction.options.getString('messageid', true);
    const title = interaction.options.getString('title', true);
    const description = interaction.options.getString('description', true);

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

      if (!message.embeds || message.embeds.length === 0) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu mesajda düzenlenecek bir embed bulunamadı.')],
        });
        return;
      }

      const existingEmbed = message.embeds[0]!;
      const hexColor = existingEmbed.hexColor;
      const colorValue = hexColor ? parseInt(hexColor.replace('#', ''), 16) : 0x5865F2;
      const newEmbed = new EmbedBuilder()
        .setTitle(title)
        .setDescription(description)
        .setColor(colorValue);

      if (existingEmbed.footer) {
        newEmbed.setFooter({ text: existingEmbed.footer.text || '', iconURL: existingEmbed.footer.iconURL });
      }
      if (existingEmbed.thumbnail) {
        newEmbed.setThumbnail(existingEmbed.thumbnail.url);
      }
      if (existingEmbed.image) {
        newEmbed.setImage(existingEmbed.image.url);
      }

      await message.edit({ embeds: [newEmbed] });

      const embed = CyberEmbed.success(`${emojis.edit} Embed Düzenlendi`)
        .addFields(
          { name: 'Mesaj ID', value: messageId, inline: true },
          { name: 'Kanal', value: `${targetChannel}`, inline: true },
          { name: 'Yeni Başlık', value: title, inline: false },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Embed düzenlenirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;
