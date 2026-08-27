import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
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

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const deleted = await EvidenceService.delete(evidenceId);

    if (!deleted) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Kanıt silinemedi. ID bulunamadı veya bir hata oluştu.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Kanıt silinemedi. ID bulunamadı veya bir hata oluştu.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const embed = CyberEmbed.success('Kanıt Silindi')
      .addFields(
        { name: 'Kanıt ID', value: evidenceId, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
