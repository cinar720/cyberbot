import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
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

    await interaction.deferReply();

    const deletedCount = await LogService.clearLogs(guild.id, type);

    if (deletedCount === 0) {
      await interaction.editReply({
        embeds: [CyberEmbed.warning('Temizlenemedi', 'Silinecek log bulunamadı.')],
      });
      return;
    }

    const embed = CyberEmbed.success(
      'Loglar Temizlendi',
      `${deletedCount} moderasyon logu başarıyla silindi.${type ? ` (Tür: \`${type}\`)` : ''}`,
    );

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
