import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'guard',
    description: 'Guard koruma durumunu gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('guard')
    .setDescription('Guard koruma durumunu gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    await interaction.deferReply();

    const db = getPrisma();
    const guildData = await db.guild.findUnique({
      where: { guildId: guild.id },
      include: { settings: true },
    });

    if (!guildData) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Sunucu verisi bulunamadı.')],
      });
      return;
    }

    const settings = guildData.settings;

    const protections = [
      { name: 'Anti-Raid', enabled: settings?.antiRaidEnabled ?? false },
      { name: 'Anti-Spam', enabled: guildData.spamProtection },
      { name: 'Otomatik Mod', enabled: guildData.autoModEnabled },
    ];

    const enabledCount = protections.filter((p) => p.enabled).length;
    const totalCount = protections.length;

    const statusEmoji = enabledCount === totalCount ? '[Tam]' : enabledCount > 0 ? '[Kismi]' : '[Yok]';

    const embed = CyberEmbed.info('Guard Koruma Durumu')
      .addFields(
        {
          name: 'Genel Durum',
          value: `${statusEmoji} **${enabledCount}/${totalCount}** koruma aktif`,
          inline: true,
        },
        {
          name: 'Maksimum Uyarı',
          value: `${guildData.maxWarnings}`,
          inline: true,
        },
        {
          name: 'Vaka Sayısı',
          value: `${guildData.caseCount}`,
          inline: true,
        },
      )
      .setDefaultFooter()
      .setTimestampNow();

    const protectionList = protections
      .map((p) => `${p.enabled ? '[Aktif]' : '[Pasif]'} ${p.name}`)
      .join('\n');

    embed.addFields({ name: 'Korumalar', value: protectionList, inline: false });

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
