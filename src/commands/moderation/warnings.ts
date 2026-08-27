import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';
import type { Case } from '@prisma/client';

export default {
  metadata: {
    name: 'warnings',
    description: 'Kullanıcının uyarılarını gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('warnings')
    .setDescription('Kullanıcının uyarılarını gösterir.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Uyarıları gösterilecek kullanıcı').setRequired(true),
    ),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const targetUser = interaction.options.getUser('kullanici', true);

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const cases = await CaseService.getAllByUser(guild.id, targetUser.id);
    const warnings = cases.filter((c: Case) => c.type === 'WARN');
    const activeWarnings = warnings.filter((c: Case) => c.active);

    if (warnings.length === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.info('Uyarılar', `${targetUser.tag} kullanıcısının hiç uyarısı yok.`)],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.info('Uyarılar', `${targetUser.tag} kullanıcısının hiç uyarısı yok.`)],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    // Uyarı listesini oluştur
    const warningList = warnings
      .slice(0, 25) // Max 25 uyarı göster
      .map((w: Case) => {
        const status = w.active ? '[Aktif]' : '[Pasif]';
        const caseNum = CaseService.formatCaseNumber(w.caseNumber);
        return `${status} **${caseNum}** - ${w.reason} (<@${w.moderatorId}>)`;
      })
      .join('\n');

    // İstatistikler
    const stats = await CaseService.getStats(guild.id, targetUser.id);

    const embed = CyberEmbed.warning(`${targetUser.tag} - Uyarılar`)
      .setThumbnail(targetUser.displayAvatarURL())
      .addFields(
        { name: 'İstatistikler', value: [
          `**Toplam Uyarı:** ${stats.warned}`,
          `**Aktif Uyarı:** ${activeWarnings.length}`,
          `**Toplam Ceza:** ${stats.total}`,
        ].join('\n'), inline: true },
        { name: 'Uyarı Listesi', value: warningList || 'Yok', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
