import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { EvidenceService } from '../../services/moderation/EvidenceService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'case',
    description: 'Case bilgilerini gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('case')
    .setDescription('Case bilgilerini gösterir.')
    .addIntegerOption((option) =>
      option.setName('caseid').setDescription('Case numarası').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const caseNumber = interaction.options.getInteger('caseid', true);

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const caseRecord = await CaseService.getByNumber(guild.id, caseNumber);

    if (!caseRecord) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const statusText = caseRecord.revoked
      ? 'Iptal Edildi'
      : caseRecord.active
        ? 'Aktif'
        : 'Pasif';

    const embed = CyberEmbed.info(`Case ${CaseService.formatCaseNumber(caseRecord.caseNumber)}`)
      .addFields(
        { name: 'Durum', value: statusText, inline: true },
        { name: 'Islem', value: caseRecord.type, inline: true },
        {
          name: 'Kullanıcı',
          value: caseRecord.target
            ? `${caseRecord.target.username} (<@${caseRecord.targetId}>)`
            : caseRecord.targetId || 'Bilinmiyor',
          inline: true,
        },
        {
          name: 'Moderatör',
          value: caseRecord.moderator
            ? `${caseRecord.moderator.username} (<@${caseRecord.moderatorId}>)`
            : `<@${caseRecord.moderatorId}>`,
          inline: true,
        },
        { name: 'Sebep', value: caseRecord.reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestamp(new Date(caseRecord.createdAt));

    if (caseRecord.durationText) {
      embed.addFields({ name: 'Süre', value: caseRecord.durationText, inline: true });
    }

    if (caseRecord.expiresAt) {
      embed.addFields({
        name: '⏰ Bitiş',
        value: `<t:${Math.floor(new Date(caseRecord.expiresAt).getTime() / 1000)}:R>`,
        inline: true,
      });
    }

    if (caseRecord.evidence && caseRecord.evidence.length > 0) {
      embed.addFields({
        name: `Kanıtlar (${caseRecord.evidence.length})`,
        value: EvidenceService.formatEvidence(caseRecord.evidence),
        inline: false,
      });
    }

    if (caseRecord.revoked) {
      embed.addFields({
        name: 'Iptal Bilgisi',
        value: `İptal eden: <@${caseRecord.revokedBy}>\nSebep: ${caseRecord.revokedReason || 'Belirtilmedi'}`,
        inline: false,
      });
    }

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
