import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

type ProtectionType = 'raid' | 'spam' | 'nuke' | 'channel' | 'role' | 'webhook';

const MODULE_MAP: Record<ProtectionType, string> = {
  raid: 'anti-raid',
  spam: 'anti-spam',
  nuke: 'anti-nuke',
  channel: 'channel-protection',
  role: 'role-protection',
  webhook: 'webhook-protection',
};

const PROTECTION_LABELS: Record<ProtectionType, string> = {
  raid: 'Anti-Raid',
  spam: 'Anti-Spam',
  nuke: 'Anti-Nuke',
  channel: 'Kanal Koruması',
  role: 'Rol Koruması',
  webhook: 'Webhook Koruması',
};

export default {
  metadata: {
    name: 'guard-config',
    description: 'Guard korumasını etkinleştirir veya devre dışı bırakır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.Administrator],
    botPermissions: [PermissionFlagsBits.SendMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('guard-config')
    .setDescription('Guard korumasını etkinleştirir veya devre dışı bırakır.')
    .addStringOption((option) =>
      option
        .setName('protection')
        .setDescription('Koruma türü')
        .setRequired(true)
        .addChoices(
          { name: 'Anti-Raid', value: 'raid' },
          { name: 'Anti-Spam', value: 'spam' },
          { name: 'Anti-Nuke', value: 'nuke' },
          { name: 'Kanal Koruması', value: 'channel' },
          { name: 'Rol Koruması', value: 'role' },
          { name: 'Webhook Koruması', value: 'webhook' },
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

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const protection = interaction.options.getString('protection', true) as ProtectionType;
    const enabled = interaction.options.getBoolean('enabled', true);

    const db = getPrisma();
    const moduleName = MODULE_MAP[protection];
    const label = PROTECTION_LABELS[protection];

    if (protection === 'raid') {
      await db.guildSettings.upsert({
        where: { guildId: guild.id },
        create: { guildId: guild.id, antiRaidEnabled: enabled },
        update: { antiRaidEnabled: enabled },
      });
    } else if (protection === 'spam') {
      await db.guild.update({
        where: { guildId: guild.id },
        data: { spamProtection: enabled },
      });
    } else {
      await db.module.upsert({
        where: { guildId_name: { guildId: guild.id, name: moduleName } },
        create: {
          guildId: guild.id,
          name: moduleName,
          displayName: label,
          enabled,
          configured: true,
        },
        update: { enabled },
      });
    }

    const embed = CyberEmbed.success(
      'Guard Koruma Güncellendi',
      `**${label}** koruması ${enabled ? 'etkinleştirildi' : 'devre dışı bırakıldı'}.`,
    )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
