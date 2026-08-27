import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'auto-response-list',
    description: 'Tüm otomatikları listeler.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('auto-response-list')
    .setDescription('Tüm otomatikları listeler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const db = getPrisma();

    const responses = await db.autoResponse.findMany({
      where: { guildId: guild.id },
      orderBy: { createdAt: 'desc' },
    });

    if (responses.length === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.info('Otomatik Yanıtlar', 'Bu sunucuda hiç otomatik yanıt bulunmuyor.')],
      }) : interaction.followUp({ embeds: [CyberEmbed.info('Otomatik Yanıtlar', 'Bu sunucuda hiç otomatik yanıt bulunmuyor.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const matchTypeMap: Record<string, string> = {
      EXACT: 'Tam',
      CONTAINS: 'İçerir',
      STARTS_WITH: 'Başlar',
    };

    const responseList = responses.map((resp, index) => {
      const status = resp.enabled ? 'Aktif' : 'Pasif';
      const matchType = matchTypeMap[resp.matchType] || resp.matchType;
      const triggerPreview = resp.trigger.length > 30 ? resp.trigger.slice(0, 27) + '...' : resp.trigger;
      return `\`${index + 1}.\` ${status} **${triggerPreview}** (${matchType})`;
    }).join('\n');

    const embed = CyberEmbed.info('Otomatik Yanıtlar', `Toplam **${responses.length}** otomatik yanıt bulundu.`)
      .setDescription(responseList)
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
