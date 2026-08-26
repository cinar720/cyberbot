import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'announce',
    description: 'Belirtilen kanala duyuru mesajı gönderir.',
    category: 'message',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('announce')
    .setDescription('Belirtilen kanala duyuru mesajı gönderir.')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Duyuru gönderilecek kanal').setRequired(true).addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option.setName('title').setDescription('Duyuru başlığı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('message').setDescription('Duyuru mesajı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, member }: CommandContext) {
    if (!member) return;

    const channel = interaction.options.getChannel('channel', true) as TextChannel;
    const title = interaction.options.getString('title', true);
    const message = interaction.options.getString('message', true);

    await interaction.deferReply();

    try {
      const embed = CyberEmbed.info(title, message)
        .setAuthor({ name: `${member.user.tag}`, iconURL: member.user.displayAvatarURL() })
        .setDefaultFooter()
        .setTimestampNow();

      await channel.send({ embeds: [embed] });

      const successEmbed = CyberEmbed.success('Duyuru Gönderildi')
        .addFields(
          { name: 'Kanal', value: `${channel}`, inline: true },
          { name: 'Başlık', value: title, inline: true },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [successEmbed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Duyuru gönderilirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;