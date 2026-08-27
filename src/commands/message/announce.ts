import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, TextChannel, MessageFlags } from 'discord.js';
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

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

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

      await (deferred ? interaction.editReply({ embeds: [successEmbed] }) : interaction.followUp({ ...{ embeds: [successEmbed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    } catch (error) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Duyuru gönderilirken bir hata oluştu.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Duyuru gönderilirken bir hata oluştu.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    }
  },
} satisfies SlashCommand;