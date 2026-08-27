import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
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

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    try {
      const channel = interaction.channel;
      if (!channel || !('messages' in channel)) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Bu komut sadece metin kanallarında kullanılabilir.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      const message = await (channel as { messages: { fetch(id: string): Promise<{ pinned: boolean; pin(): Promise<unknown> }> } }).messages.fetch(messageId);
      if (!message) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Mesaj bulunamadı.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      if (message.pinned) {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj zaten sabitlenmiş.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Bu mesaj zaten sabitlenmiş.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
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