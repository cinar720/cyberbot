import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'case-revoke',
    description: 'Bir case\'i iptal eder.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('case-revoke')
    .setDescription('Bir case\'i iptal eder.')
    .addIntegerOption((option) =>
      option.setName('caseid').setDescription('Case numarası').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('reason').setDescription('İptal sebebi').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const caseNumber = interaction.options.getInteger('caseid', true);
    const reason = interaction.options.getString('reason', true);

    await interaction.deferReply();

    const caseRecord = await CaseService.getByNumber(guild.id, caseNumber);

    if (!caseRecord) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      });
      return;
    }

    if (caseRecord.revoked) {
      await interaction.editReply({
        embeds: [CyberEmbed.warning('Uyarı', `Case #${caseNumber} zaten iptal edilmiş.`)],
      });
      return;
    }

    const revoked = await CaseService.revoke(caseRecord.id, member.id, reason);

    const embed = CyberEmbed.success('Case İptal Edildi')
      .addFields(
        { name: 'Case', value: CaseService.formatCaseNumber(revoked.caseNumber), inline: true },
        { name: 'Kullanıcı', value: `<@${revoked.targetId}>`, inline: true },
        { name: 'İptal Eden', value: `${member.user.tag}`, inline: true },
        { name: 'İptal Sebebi', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
