import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'blacklist',
    description: 'Kara listeyi gösterir.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('blacklist')
    .setDescription('Kara listeyi gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const db = getPrisma();

    const blacklistedWords = await db.blacklistedWord.findMany({
      where: { guildId: guild.id, enabled: true },
      orderBy: { createdAt: 'desc' },
    });

    if (blacklistedWords.length === 0) {
      await interaction.reply({
        embeds: [CyberEmbed.info('Kara Liste', 'Bu sunucuda kara listeye alınmış kelime bulunmuyor.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const embed = CyberEmbed.info('Kara Liste', `Bu sunucuda **${blacklistedWords.length}** kelime kara listeye alınmış.`)
      .addFields(
        blacklistedWords.map((w) => ({
          name: w.word,
          value: `Eylem: **${w.action}** | Ekleyen: <@${w.createdBy}>`,
          inline: true,
        })),
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
  },
} satisfies SlashCommand;
