import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { EvidenceService } from '../../services/moderation/EvidenceService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';
import type { EvidenceType } from '../../services/moderation/EvidenceService.js';

export default {
  metadata: {
    name: 'evidence-add',
    description: 'Case\'e kanıt ekler.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('evidence-add')
    .setDescription('Case\'e kanıt ekler.')
    .addIntegerOption((option) =>
      option.setName('caseid').setDescription('Case numarası').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('type')
        .setDescription('Kanıt türü')
        .setRequired(true)
        .addChoices(
          { name: 'Mesaj Linki', value: 'MESSAGE_URL' },
          { name: 'Görsel', value: 'IMAGE' },
          { name: 'Video', value: 'VIDEO' },
          { name: 'Metin', value: 'TEXT' },
          { name: 'Dış Bağlantı', value: 'EXTERNAL_URL' },
        ),
    )
    .addStringOption((option) =>
      option.setName('content').setDescription('Kanıt içeriği (metin için)').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('url').setDescription('Kanıt URL\'si').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const caseNumber = interaction.options.getInteger('caseid', true);
    const type = interaction.options.getString('type', true) as EvidenceType;
    const content = interaction.options.getString('content');
    const url = interaction.options.getString('url');

    await interaction.deferReply();

    const caseRecord = await CaseService.getByNumber(guild.id, caseNumber);

    if (!caseRecord) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', `Case #${caseNumber} bulunamadı.`)],
      });
      return;
    }

    const evidenceData: { type: EvidenceType; content?: string; url?: string } = { type };

    if (content) evidenceData.content = content;
    if (url) evidenceData.url = url;

    const evidence = await EvidenceService.add(caseRecord.id, evidenceData);

    const embed = CyberEmbed.success('Kanıt Eklendi')
      .addFields(
        { name: 'Case', value: CaseService.formatCaseNumber(caseRecord.caseNumber), inline: true },
        { name: 'Kanıt ID', value: evidence.id, inline: true },
        { name: 'Tür', value: evidence.type, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (evidence.url) {
      embed.addFields({ name: 'URL', value: evidence.url, inline: false });
    }

    if (evidence.content) {
      embed.addFields({ name: 'İçerik', value: evidence.content, inline: false });
    }

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
