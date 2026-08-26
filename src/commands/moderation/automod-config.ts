import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

const VALID_RULES = ['spam', 'mentions', 'invite', 'blacklist', 'caps', 'repeated'] as const;
type ValidRule = (typeof VALID_RULES)[number];

const RULE_CODE_MAP: Record<ValidRule, string> = {
  spam: 'SPAM',
  mentions: 'MENTION_SPAM',
  invite: 'INVITE_LINK',
  blacklist: 'BLACKLISTED_WORD',
  caps: 'CAPS_SPAM',
  repeated: 'REPEATED_MESSAGE',
};

const RULE_NAME_MAP: Record<ValidRule, string> = {
  spam: 'Spam',
  mentions: 'Mention Spam',
  invite: 'Davet Bağlantısı',
  blacklist: 'Yasaklı Kelime',
  caps: 'Büyük Harf Spam',
  repeated: 'Tekrarlanan Mesaj',
};

export default {
  metadata: {
    name: 'automod-config',
    description: 'Otomatik moderasyon kuralını etkinleştirir veya devre dışı bırakır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('automod-config')
    .setDescription('Otomatik moderasyon kuralını etkinleştirir veya devre dışı bırakır.')
    .addStringOption((option) =>
      option
        .setName('rule')
        .setDescription('Kural adı')
        .setRequired(true)
        .addChoices(
          ...VALID_RULES.map((r) => ({ name: RULE_NAME_MAP[r], value: r })),
        ),
    )
    .addBooleanOption((option) =>
      option
        .setName('enabled')
        .setDescription('Etkinleştir veya devre dışı bırak')
        .setRequired(true),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const ruleName = interaction.options.getString('rule', true) as ValidRule;
    const enabled = interaction.options.getBoolean('enabled', true);

    if (!VALID_RULES.includes(ruleName)) {
      await interaction.editReply({
        embeds: [
          CyberEmbed.error(
            'Geçersiz Kural',
            `Geçerli kurallar: ${VALID_RULES.join(', ')}`,
          ),
        ],
      });
      return;
    }

    const db = getPrisma();
    const ruleCode = RULE_CODE_MAP[ruleName];

    const existing = await db.violationRule.findUnique({
      where: { guildId_code: { guildId: guild.id, code: ruleCode } },
    });

    if (existing) {
      await db.violationRule.update({
        where: { guildId_code: { guildId: guild.id, code: ruleCode } },
        data: { enabled },
      });
    } else {
      await db.violationRule.create({
        data: {
          guildId: guild.id,
          code: ruleCode,
          name: RULE_NAME_MAP[ruleName],
          category: 'GENEL',
          enabled,
          punishmentType: 'WARN',
          points: 1,
        },
      });
    }

    const statusText = enabled ? 'Etkinleştirildi' : 'Devre Dışı Bırakıldı';

    const embed = CyberEmbed.success('Kural Güncellendi')
      .addFields(
        { name: 'Kural', value: RULE_NAME_MAP[ruleName], inline: true },
        { name: 'Durum', value: statusText, inline: true },
        { name: 'Kod', value: `\`${ruleCode}\``, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
