import {
  SlashCommandBuilder,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  MessageFlags,
  type User,
} from 'discord.js';
import { colors } from '../../config/colors.js';
import { emojis } from '../../config/emojis.js';
import { LevelService } from '../../services/level/LevelService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

function buildProgressBar(current: number, max: number, length: number = 20): string {
  if (max <= 0) return '`' + '░'.repeat(length) + '`';
  const filled = Math.round((current / max) * length);
  const empty = length - filled;
  return '`' + '█'.repeat(Math.max(0, filled)) + '░'.repeat(Math.max(0, empty)) + '`';
}

export default {
  metadata: {
    name: 'seviye',
    description: 'Seviyenizi veya bir kullanıcının seviyesini gösterir.',
    category: 'utility',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('seviye')
    .setDescription('Seviyenizi veya bir kullanıcının seviyesini gösterir.')
    .addUserOption((option) =>
      option
        .setName('kullanici')
        .setDescription('Seviyesini görmek istediğiniz kullanıcı')
        .setRequired(false),
    ),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const targetUser: User = interaction.options.getUser('kullanici') ?? interaction.user;
    const userId = targetUser.id;

    const levelData = await LevelService.getLevel(guild.id, userId);

    if (!levelData) {
      const container = new ContainerBuilder().setAccentColor(colors.warning);
      container.addTextDisplayComponents(
        new TextDisplayBuilder().setContent(`# ${emojis.warning} Seviye Bulunamadı\n\n${targetUser} kullanıcısına ait seviye kaydı bulunamadı.`),
      );

      if (deferred) {
        await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
      } else {
        await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2, MessageFlags.Ephemeral] }).catch(() => null);
      }
      return;
    }

    const xpForNext = LevelService.getXpForLevel(levelData.level + 1);
    const xpForCurrent = LevelService.getXpForLevel(levelData.level);
    const progress = levelData.totalXp - xpForCurrent;
    const needed = xpForNext - xpForCurrent;
    const progressBar = buildProgressBar(progress, needed);

    const container = new ContainerBuilder().setAccentColor(colors.info);

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# ${emojis.star} Seviye Bilgisi`),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Kullanıcı:** ${targetUser}\n` +
        `**Seviye:** ${levelData.level}\n` +
        `**Toplam XP:** ${levelData.totalXp.toLocaleString()}\n` +
        `**Mesaj Sayısı:** ${levelData.messages.toLocaleString()}`,
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `**Sonraki Seviye:** ${progress.toLocaleString()} / ${needed.toLocaleString()} XP\n${progressBar}`,
      ),
    );

    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`Level ${levelData.level + 1} için **${(needed - progress).toLocaleString()}** XP gerekli.`),
    );

    if (deferred) {
      await interaction.editReply({ components: [container], flags: [MessageFlags.IsComponentsV2] });
    } else {
      await interaction.followUp({ components: [container], flags: [MessageFlags.IsComponentsV2] }).catch(() => null);
    }
  },
} satisfies SlashCommand;
