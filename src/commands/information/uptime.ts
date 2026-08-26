import { SlashCommandBuilder } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'uptime',
    description: 'Bot çalışma süresini gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('uptime')
    .setDescription('Bot çalışma süresini gösterir.'),

  async execute({ interaction }) {
    const uptime = formatUptime(process.uptime());
    const startedAt = new Date(Date.now() - process.uptime() * 1000);

    const embed = CyberEmbed.info('Bot Çalışma Süresi')
      .addFields(
        { name: 'Çalışma Süresi', value: `\`${uptime}\``, inline: true },
        { name: 'Başlangıç', value: `<t:${Math.floor(startedAt.getTime() / 1000)}:R>`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}sa`);
  if (minutes > 0) parts.push(`${minutes}dk`);
  if (secs > 0) parts.push(`${secs}s`);

  return parts.join(' ') || '0s';
}
