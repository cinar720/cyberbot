import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags, type VoiceChannel } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'move',
    description: 'Kullanıcıyı ses kanalına taşır.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.MoveMembers],
    botPermissions: [PermissionFlagsBits.MoveMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('move')
    .setDescription('Kullanıcıyı ses kanalına taşır.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Taşınacak kullanıcı').setRequired(true),
    )
    .addChannelOption((option) =>
      option
        .setName('channel')
        .setDescription('Hedef ses kanalı')
        .setRequired(true)
        .addChannelTypes(ChannelType.GuildVoice),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('user', true);
    const channel = interaction.options.getChannel('channel', true);

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (!targetMember.voice.channel) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı şu an bir ses kanalında değil.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await targetMember.voice.setChannel(channel as VoiceChannel);

    const embed = CyberEmbed.success('Kullanıcı Taşındı')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Yeni Kanal', value: `${channel.name}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
