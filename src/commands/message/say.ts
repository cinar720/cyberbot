import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
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

    await interaction.deferReply();

    try {
      await channel.send(message);

      const successEmbed = CyberEmbed.success('Mesaj Gönderildi')
        .addFields(
          { name: 'Kanal', value: `${channel}`, inline: true },
          { name: 'Mesaj', value: message.substring(0, 1024), inline: false },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Mesaj gönderilirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;