import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'say',
    description: 'Bot olarak mesaj gönderir.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('say')
    .setDescription('Bot olarak mesaj gönderir.')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Mesaj gönderilecek kanal').setRequired(true).addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option.setName('message').setDescription('Gönderilecek mesaj').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction }: CommandContext) {
    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    const message = interaction.options.getString('message', true);

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    try {
      await channel.send(message);

      const successEmbed = CyberEmbed.success('Mesaj Gönderildi')
        .addFields(
          { name: 'Kanal', value: `${channel}`, inline: true },
          { name: 'Mesaj', value: message.substring(0, 1024), inline: false },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await (deferred ? interaction.editReply({ embeds: [successEmbed] }) : interaction.followUp({ ...{ embeds: [successEmbed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    } catch (error) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesaj gönderilirken bir hata oluştu.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Mesaj gönderilirken bir hata oluştu.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    }
  },
} satisfies SlashCommand;