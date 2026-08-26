import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { EvidenceService } from '../../services/moderation/EvidenceService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'evidence-remove',
    description: 'Bir kanıtı siler.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('evidence-remove')
    .setDescription('Bir kanıtı siler.')
    .addStringOption((option) =>
      option.setName('evidenceid').setDescription('Kanıt ID').setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction }: CommandContext) {
    const evidenceId = interaction.options.getString('evidenceid', true);

    await interaction.deferReply();

    const deleted = await EvidenceService.delete(evidenceId);

    if (!deleted) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Kanıt silinemedi. ID bulunamadı veya bir hata oluştu.')],
      });
      return;
    }

    const embed = CyberEmbed.success('Kanıt Silindi')
      .addFields(
        { name: 'Kanıt ID', value: evidenceId, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
