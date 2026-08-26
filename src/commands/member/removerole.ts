import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'removerole',
    description: 'Kullanıcıdan rol kaldırır.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageRoles],
    botPermissions: [PermissionFlagsBits.ManageRoles],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('removerole')
    .setDescription('Kullanıcıdan rol kaldırır.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Rolü kaldırılacak kullanıcı').setRequired(true),
    )
    .addRoleOption((option) =>
      option.setName('role').setDescription('Kaldırılacak rol').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('user', true);
    const role = interaction.options.getRole('role', true);

    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const botMember = await guild.members.fetch(interaction.client.user.id);

    // Hiyerarşi kontrolü
    if (botMember.roles.highest.position <= role.position) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Botun rolü, kaldırılacak rolden yüksek olmalı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (member.roles.highest.position <= role.position) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Senin rolün, kaldırılacak rolden yüksek olmalı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    if (!targetMember.roles.cache.has(role.id)) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcıda bu rol zaten mevcut değil.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await targetMember.roles.remove(role.id);

    const embed = CyberEmbed.success('Rol Kaldırıldı')
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Rol', value: `${role.name}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
