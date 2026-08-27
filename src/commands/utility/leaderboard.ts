import {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
} from 'discord.js';
import { colors } from '../../config/colors.js';
import { emojis } from '../../config/emojis.js';
import { LevelService } from '../../services/level/LevelService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

const medals = ['🥇', '🥈', '🥉'];

export default {
  metadata: {
    name: 'liderlik-tablosu',
    description: 'Sunucudaki en iyi 10 kullanıcıyı gösterir.',
    category: 'utility',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('liderlik-tablosu')
    .setDescription('Sunucudaki en iyi 10 kullanıcıyı gösterir.'),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const leaderboard = await LevelService.getLeaderboard(guild.id, 10);

    if (leaderboard.length === 0) {
      const container = new ContainerBuilder().setAccentColor(colors.warning);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.warning} Boş\n\nBu sunucuda henüz seviye kaydı bulunmuyor.`),
      );

      if (deferred) {
        await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
      } else {
        await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] }).catch(() => null);
      }
      return;
    }

    const lines = leaderboard.map((entry, index) => {
      const medal = medals[index] ?? `**${index + 1}.**`;
      return `${medal} <@${entry.userId}> — **Level ${entry.level}** (${entry.totalXp.toLocaleString()} XP)`;
    });

    const container = new ContainerBuilder().setAccentColor(colors.gold);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emojis.trophy} Liderlik Tablosu`),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(lines.join('\n')),
    );

    if (deferred) {
      await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    } else {
      await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
    }
  },
} satisfies SlashCommand;
