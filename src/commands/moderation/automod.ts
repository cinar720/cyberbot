import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'automod',
    description: 'Otomatik moderasyon durumunu gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('automod')
    .setDescription('Otomatik moderasyon durumunu gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const db = getPrisma();

    const [guildData, violationRules, blacklistedWords] = await Promise.all([
      db.guild.findUnique({ where: { guildId: guild.id } }),
      db.violationRule.findMany({ where: { guildId: guild.id } }),
      db.blacklistedWord.findMany({ where: { guildId: guild.id } }),
    ]);

    if (!guildData) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Sunucu verisi bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Sunucu verisi bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const activeRules = violationRules.filter((r) => r.enabled).length;
    const disabledRules = violationRules.filter((r) => !r.enabled).length;
    const activeBlacklist = blacklistedWords.filter((w) => w.enabled).length;

    const statusText = guildData.autoModEnabled ? 'Aktif' : 'Devre Dışı';
    const spamText = guildData.spamProtection ? 'Aktif' : 'Devre Dışı';

    const embed = CyberEmbed.success('Otomatik Moderasyon Durumu')
      .addFields(
        { name: 'Genel Durum', value: statusText, inline: true },
        { name: 'Spam Koruması', value: spamText, inline: true },
        { name: 'Toplam Kural', value: `${violationRules.length}`, inline: true },
        { name: 'Aktif Kurallar', value: `${activeRules}`, inline: true },
        { name: 'Devre Dışı Kurallar', value: `${disabledRules}`, inline: true },
        { name: 'Yasaklı Kelimeler', value: `${activeBlacklist} aktif`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (violationRules.length > 0) {
      const rulesList = violationRules
        .map((r) => `${r.enabled ? '[Aktif]' : '[Pasif]'} **${r.name}** (\`${r.code}\`) - ${r.punishmentType}`)
        .join('\n');

      embed.addFields({ name: 'Kurallar', value: rulesList.slice(0, 1024) });
    }

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
