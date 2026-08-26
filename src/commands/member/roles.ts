import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'roles',
    description: 'Sunucudaki tüm rolleri gösterir.',
    category: 'member',
    cooldown: 5,
    permissions: [PermissionFlagsBits.UseApplicationCommands],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('roles')
    .setDescription('Sunucudaki tüm rolleri gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.UseApplicationCommands),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    await interaction.deferReply();

    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position);

    if (roles.size === 0) {
      await interaction.editReply({
        embeds: [CyberEmbed.warning('Roller', 'Sunucuda hiç rol bulunamadı.')],
      });
      return;
    }

    const roleList = roles.map((role) => {
      const memberCount = role.members.size;
      return `${role} - **${memberCount}** üye`;
    });

    const embed = CyberEmbed.info('Sunucu Rolleri')
      .setDescription(`Toplam **${roles.size}** rol bulundu.`)
      .addFields(
        { name: 'Roller', value: roleList.join('\n') || 'Yok', inline: false },
      )
      .setThumbnail(guild.iconURL({ size: 512 }) || '')
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
