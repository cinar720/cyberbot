import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'undeaf',
    description: 'Kullanıcının sağırlığını kaldırır.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.DeafenMembers],
    botPermissions: [PermissionFlagsBits.DeafenMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('undeaf')
    .setDescription('Kullanıcının sağırlığını kaldırır.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Sağırlığı kaldırılacak kullanıcı').setRequired(true),
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

    if (!targetMember.voice.deaf) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı zaten sağırlaştırılmamış.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await targetMember.voice.setDeaf(false);

    const embed = CyberEmbed.success('Sağırlık Kaldırıldı')
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
