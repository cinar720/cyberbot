import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { LogService } from '../../services/moderation/LogService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'log-clear',
    description: 'Moderasyon loglarını temizler.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('log-clear')
    .setDescription('Moderasyon loglarını temizler.')
    .addStringOption((option) =>
      option.setName('type').setDescription('Belirli türdeki logları temizle (ör: WARN, BAN)').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const type = interaction.options.getString('type') ?? undefined;

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const deletedCount = await LogService.clearLogs(guild.id, type);

    if (deletedCount === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Temizlenemedi', 'Silinecek log bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.warning('Temizlenemedi', 'Silinecek log bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const embed = CyberEmbed.success(
      'Loglar Temizlendi',
      `${deletedCount} moderasyon logu başarıyla silindi.${type ? ` (Tür: \`${type}\`)` : ''}`,
    );

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
