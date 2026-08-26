import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'automod-status',
    description: 'Otomatik moderasyon kural durumlarını gösterir.',
    category: 'moderation',
    cooldown: 5,
    enabled: false,
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

    await interaction.deferReply();

    const db = getPrisma();

    const rules = await db.violationRule.findMany({
      where: { guildId: guild.id },
      orderBy: { code: 'asc' },
    });

    if (rules.length === 0) {
      await interaction.editReply({
        embeds: [
          CyberEmbed.info(
            'Kural Bulunamadı',
            'Bu sunucuda henüz tanımlanmış otomatik moderasyon kuralı yok.',
          ),
        ],
      });
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

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
