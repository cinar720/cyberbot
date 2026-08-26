import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { AppealService } from '../../services/moderation/AppealService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

const statusMap: Record<string, string> = {
  PENDING: 'Beklemede',
  APPROVED: 'Onaylandı',
  REJECTED: 'Reddedildi',
};

export default {
  metadata: {
    name: 'appeal-info',
    description: 'İtiraz hakkında bilgi gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('appeal-info')
    .setDescription('İtiraz hakkında bilgi gösterir.')
    .addStringOption((option) =>
      option.setName('appealid').setDescription('İtiraz ID').setRequired(true),
    ),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const appealId = interaction.options.getString('appealid', true);

    await interaction.deferReply();

    const appeal = await AppealService.getById(appealId);
    if (!appeal) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'İtiraz bulunamadı.')],
      });
      return;
    }

    const caseNumber = appeal.case.caseNumber;
    const status = statusMap[appeal.status] || appeal.status;

    const embed = CyberEmbed.info('İtiraz Detayları')
      .addFields(
        { name: 'İtiraz ID', value: appeal.id, inline: true },
        { name: 'Case', value: `#${caseNumber}`, inline: true },
        { name: 'Durum', value: status, inline: true },
        { name: 'Kullanıcı', value: `<@${appeal.userId}>`, inline: true },
        { name: 'Karar Veren', value: appeal.case.moderator ? `<@${appeal.case.moderator.id}>` : 'Bilinmiyor', inline: true },
        { name: 'İtiraz Sebebi', value: appeal.reason, inline: false },
      )
      .setTimestamp(appeal.createdAt)
      .setDefaultFooter()
      .setTimestampNow();

    if (appeal.response) {
      embed.addFields({ name: 'Yanıt', value: appeal.response, inline: false });
    }

    if (appeal.reviewedBy) {
      embed.addFields({ name: 'İncelyen', value: `<@${appeal.reviewedBy}>`, inline: true });
    }

    if (appeal.reviewedAt) {
      embed.addFields({ name: 'İncelenme Tarihi', value: `<t:${Math.floor(appeal.reviewedAt.getTime() / 1000)}:F>`, inline: true });
    }

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
