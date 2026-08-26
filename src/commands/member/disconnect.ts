import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'disconnect',
    description: 'Kullanıcıyı ses kanalından atar.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.MoveMembers],
    botPermissions: [PermissionFlagsBits.MoveMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Kullanıcıyı ses kanalından atar.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Atılacak kullanıcı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.MoveMembers),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('user', true);

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

    const channelName = targetMember.voice.channel.name;
    await targetMember.voice.disconnect();

    const embed = CyberEmbed.success('Kullanıcı Atıldı')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Kanal', value: `${channelName}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
