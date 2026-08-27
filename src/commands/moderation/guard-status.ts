import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'guard-status',
    description: 'Guard koruma detaylarını gösterir.',
    category: 'moderation',
    cooldown: 5,
    enabled: false,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('guard-status')
    .setDescription('Guard koruma detaylarını gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const db = getPrisma();
    const guildData = await db.guild.findUnique({
      where: { guildId: guild.id },
      include: { settings: true, modules: true },
    });

    if (!guildData) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Sunucu verisi bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Sunucu verisi bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const settings = guildData.settings;
    const guardModules = guildData.modules.filter((m) =>
      ['guard', 'anti-raid', 'anti-spam', 'anti-nuke', 'channel-protection', 'role-protection', 'webhook-protection'].includes(m.name),
    );

    const formatStatus = (enabled: boolean): string =>
      enabled ? 'Etkin' : 'Devre Dışı';

    const protectionDetails = [
      {
        name: 'Anti-Raid',
        value: [
          `Durum: ${formatStatus(settings?.antiRaidEnabled ?? false)}`,
          `Eşik: ${settings?.antiRaidThreshold ?? 5} katılım/saniye`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Anti-Spam',
        value: [
          `Durum: ${formatStatus(guildData.spamProtection)}`,
          `Otomatik Mod: ${formatStatus(guildData.autoModEnabled)}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: 'Anti-Nuke',
        value: formatStatus(
          guardModules.some((m) => m.name === 'anti-nuke' && m.enabled),
        ),
        inline: true,
      },
      {
        name: 'Kanal Koruması',
        value: formatStatus(
          guardModules.some((m) => m.name === 'channel-protection' && m.enabled),
        ),
        inline: true,
      },
      {
        name: 'Rol Koruması',
        value: formatStatus(
          guardModules.some((m) => m.name === 'role-protection' && m.enabled),
        ),
        inline: true,
      },
      {
        name: 'Webhook Koruması',
        value: formatStatus(
          guardModules.some((m) => m.name === 'webhook-protection' && m.enabled),
        ),
        inline: true,
      },
    ];

    const activeCount = protectionDetails.filter((p) =>
      p.value.includes('Etkin'),
    ).length;

    const embed = CyberEmbed.info('Guard Koruma Detayları')
      .addFields(
        ...protectionDetails,
        {
          name: 'Özet',
          value: `**${activeCount}**/${protectionDetails.length} koruma aktif`,
          inline: false,
        },
        {
          name: 'Ayarlar',
          value: [
            `Maks Uyarı: **${guildData.maxWarnings}**`,
            `Dil: **${guildData.language}**`,
            `Log Kanalı: ${guildData.logChannelId ? `<#${guildData.logChannelId}>` : 'Ayarlanmamış'}`,
          ].join('\n'),
          inline: false,
        },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
