import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'deaf',
    description: 'Kullanıcıyı sağırlaştırır.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.DeafenMembers],
    botPermissions: [PermissionFlagsBits.DeafenMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('deaf')
    .setDescription('Kullanıcıyı sağırlaştırır.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Sağırlaştırılacak kullanıcı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.DeafenMembers),

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

    if (targetMember.voice.deaf) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı zaten sağırlaştırılmış.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await targetMember.voice.setDeaf(true);

    const embed = CyberEmbed.success('Kullanıcı Sağırlaştırıldı')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Kanal', value: `${targetMember.voice.channel.name}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
