import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'automod-status',
    description: 'Otomatik moderasyon kural durumlarını gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('automod-status')
    .setDescription('Otomatik moderasyon kural durumlarını gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const db = getPrisma();

    const rules = await db.violationRule.findMany({
      where: { guildId: guild.id },
      orderBy: { code: 'asc' },
    });

    if (rules.length === 0) {
      await (deferred ? interaction.editReply({
        embeds: [
          CyberEmbed.info(
            'Kural Bulunamadı',
            'Bu sunucuda henüz tanımlanmış otomatik moderasyon kuralı yok.',
          ),
        ],
      }) : interaction.followUp({ ...{
        embeds: [
          CyberEmbed.info(
            'Kural Bulunamadı',
            'Bu sunucuda henüz tanımlanmış otomatik moderasyon kuralı yok.',
          ),
        ],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const embed = CyberEmbed.success('Otomatik Moderasyon Kuralları')
      .setDescription(`Toplam **${rules.length}** kural bulundu.`)
      .setDefaultFooter()
      .setTimestampNow();

    const categories = new Map<string, typeof rules>();

    for (const rule of rules) {
      const cat = rule.category || 'GENEL';
      const list = categories.get(cat) || [];
      list.push(rule);
      categories.set(cat, list);
    }

    for (const [category, categoryRules] of categories) {
      const lines = categoryRules.map(
        (r) =>
          `${r.enabled ? '[Aktif]' : '[Pasif]'} **${r.name}** (\`${r.code}\`)\n` +
          `> Ceza: ${r.punishmentType} | Puan: ${r.points} | Kategori: ${r.category}`,
      );

      embed.addFields({
        name: `${category}`,
        value: lines.join('\n').slice(0, 1024),
        inline: false,
      });
    }

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
