import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
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

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const roles = guild.roles.cache
      .filter((role) => role.id !== guild.id)
      .sort((a, b) => b.position - a.position);

    if (roles.size === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Roller', 'Sunucuda hiç rol bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.warning('Roller', 'Sunucuda hiç rol bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
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

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
