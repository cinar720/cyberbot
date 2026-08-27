import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'customcommand-list',
    description: 'Tüm özel komutları listeler.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [PermissionFlagsBits.ManageGuild],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('customcommand-list')
    .setDescription('Tüm özel komutları listeler.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const db = getPrisma();

    const commands = await db.customCommand.findMany({
      where: { guildId: guild.id },
      orderBy: { createdAt: 'desc' },
    });

    if (commands.length === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.info('Özel Komutlar', 'Bu sunucuda hiç özel komut bulunmuyor.')],
      }) : interaction.followUp({ embeds: [CyberEmbed.info('Özel Komutlar', 'Bu sunucuda hiç özel komut bulunmuyor.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const commandList = commands.map((cmd, index) => {
      const status = cmd.enabled ? 'Aktif' : 'Pasif';
      const responsePreview = cmd.response.length > 50 ? cmd.response.slice(0, 47) + '...' : cmd.response;
      return `\`${index + 1}.\` ${status} **${cmd.name}** → ${responsePreview}`;
    }).join('\n');

    const embed = CyberEmbed.info('Özel Komutlar', `Toplam **${commands.length}** özel komut bulundu.`)
      .setDescription(commandList)
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ embeds: [embed], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
