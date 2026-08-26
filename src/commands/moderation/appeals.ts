import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { AppealService } from '../../services/moderation/AppealService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'appeals',
    description: 'Bekleyen itirazları gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('appeals')
    .setDescription('Bekleyen itirazları gösterir.'),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    await interaction.deferReply();

    const appeals = await AppealService.getPending(guild.id);

    if (appeals.length === 0) {
      await interaction.editReply({
        embeds: [CyberEmbed.info('İtirazlar', 'Bekleyen itiraz bulunmamaktadır.')],
      });
      return;
    }

    const embed = CyberEmbed.info('Bekleyen İtirazlar', `Toplam **${appeals.length}** bekleyen itiraz.`)
      .setDefaultFooter()
      .setTimestampNow();

    for (const appeal of appeals.slice(0, 25)) {
      const caseNumber = appeal.case.caseNumber;
      embed.addFields({
        name: `${appeal.id}`,
        value: [
          `**Case:** #${caseNumber}`,
          `**Kullanıcı:** <@${appeal.userId}>`,
          `**Sebep:** ${appeal.reason.length > 100 ? appeal.reason.slice(0, 100) + '...' : appeal.reason}`,
          `**Tarih:** <t:${Math.floor(appeal.createdAt.getTime() / 1000)}:R>`,
        ].join('\n'),
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
