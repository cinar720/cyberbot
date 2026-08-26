import { SlashCommandBuilder, PermissionFlagsBits, ChannelType } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'delete',
    description: 'Belirtilen kanaldaki bir mesajı siler.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('Belirtilen kanaldaki bir mesajı siler.')
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Mesajın bulunduğu kanal')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option.setName('messageid').setDescription('Silinecek mesaj ID').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const channel = interaction.options.getChannel('channel', true);
    const messageId = interaction.options.getString('messageid', true);

    await interaction.deferReply();

    try {
      const targetChannel = await guild.channels.fetch(channel.id);
      if (!targetChannel || !targetChannel.isTextBased() || !('messages' in targetChannel)) {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu kanalda mesaj silme işlemi yapılamaz.')],
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

      await message.delete();

      const embed = CyberEmbed.success('Mesaj Silindi')
        .addFields(
          { name: 'Mesaj ID', value: messageId, inline: true },
          { name: 'Kanal', value: `${targetChannel}`, inline: true },
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
