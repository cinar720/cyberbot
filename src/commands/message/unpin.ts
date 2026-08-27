import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
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

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    try {
      const channel = interaction.channel;
      if (!channel || !channel.isTextBased() || !('messages' in channel)) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      const message = await channel.messages.fetch(messageId);
      if (!message) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      if (!message.pinned) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj zaten sabitlenmemiş.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj zaten sabitlenmemiş.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
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
