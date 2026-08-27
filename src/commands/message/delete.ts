import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
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

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    try {
      const targetChannel = await guild.channels.fetch(channel.id);
      if (!targetChannel || !targetChannel.isTextBased() || !('messages' in targetChannel)) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu kanalda mesaj silme işlemi yapılamaz.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Bu kanalda mesaj silme işlemi yapılamaz.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      const message = await targetChannel.messages.fetch(messageId);
      if (!message) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
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

      await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    } catch (error) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı veya botun yetkisi yeterli değil.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı veya botun yetkisi yeterli değil.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    }
  },
} satisfies SlashCommand;
