import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { EvidenceService } from '../../services/moderation/EvidenceService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'evidence',
    description: 'Case\'e ait kanıtları gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('evidence')
    .setDescription('Case\'e ait kanıtları gösterir.')
    .addIntegerOption((option) =>
      option.setName('caseid').setDescription('Case numarası').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const caseNumber = interaction.options.getInteger('caseid', true);

    await interaction.deferReply();

    const caseRecord = await CaseService.getByNumber(guild.id, caseNumber);

    if (!caseRecord) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      });
      return;
    }

    if (!caseRecord.evidence || caseRecord.evidence.length === 0) {
      await interaction.editReply({
        embeds: [
          CyberEmbed.warning(
            'Kanıt Yok',
            `Case ${CaseService.formatCaseNumber(caseRecord.caseNumber)} için kayıtlı kanıt bulunmamaktadır.`,
          ),
        ],
      });
      return;
    }

    const formattedEvidence = EvidenceService.formatEvidence(caseRecord.evidence);

    const embed = CyberEmbed.info(
      `Case ${CaseService.formatCaseNumber(caseRecord.caseNumber)} - Kanıtlar`,
      formattedEvidence,
    )
      .addFields(
        {
          name: 'Kullanıcı',
          value: caseRecord.target ? `${caseRecord.target.username}` : caseRecord.targetId || 'Bilinmiyor',
          inline: true,
        },
        {
          name: 'Islem',
          value: caseRecord.type,
          inline: true,
        },
        {
          name: 'Kanıt Sayısı',
          value: String(caseRecord.evidence.length),
          inline: true,
        },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
