import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'role',
    description: 'Kullanıcının rollerini gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('role')
    .setDescription('Kullanıcının rollerini gösterir.')
    .addUserOption((option) =>
      option.setName('user').setDescription('Rolleri görüntülenecek kullanıcı').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('user', true);
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
      });
      return;
    }

    const roles = targetMember.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position)
      .map((role) => role.toString());

    const embed = CyberEmbed.info('Kullanıcı Rolleri')
      .setThumbnail(targetUser.displayAvatarURL({ size: 512 }))
      .addFields(
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Toplam Rol', value: `${roles.length}`, inline: true },
        { name: `Roller`, value: roles.length > 0 ? roles.join('\n') : 'Rol yok', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
