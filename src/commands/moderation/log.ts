import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { LogService } from '../../services/moderation/LogService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'log',
    description: 'Moderasyon loglarını gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('log')
    .setDescription('Moderasyon loglarını gösterir.')
    .addStringOption((option) =>
      option.setName('type').setDescription('Filtreleme türü (ör: WARN, BAN, KICK)').setRequired(false),
    )
    .addUserOption((option) =>
      option.setName('user').setDescription('Kullanıcıya göre filtrele').setRequired(false),
    )
    .addIntegerOption((option) =>
      option.setName('limit').setDescription('Gösterilecek log sayısı').setMinValue(1).setMaxValue(50).setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const type = interaction.options.getString('type') ?? undefined;
    const user = interaction.options.getUser('user') ?? undefined;
    const limit = interaction.options.getInteger('limit') ?? 10;

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const logs = await LogService.getLogs(guild.id, {
      type,
      targetId: user?.id,
      limit,
    });

    if (logs.length === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Bulunamadı', 'Filtrelere uygun log bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.warning('Bulunamadı', 'Filtrelere uygun log bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const description = logs.map((entry) => {
      const parts: string[] = [];

      if (entry.caseNumber) {
        parts.push(`**#${String(entry.caseNumber).padStart(6, '0')}**`);
      }

      parts.push(`\`${entry.action}\``);

      if (entry.targetId) {
        parts.push(`→ <@${entry.targetId}>`);
      }

      parts.push(`by <@${entry.moderatorId}>`);
      parts.push(`<t:${Math.floor(entry.createdAt.getTime() / 1000)}:R>`);

      return parts.join(' ');
    }).join('\n');

    const embed = CyberEmbed.info(
      `${logs.length} Moderasyon Logu`,
      description,
    )
      .setFooter({ text: `Toplam: ${logs.length} log` })
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
