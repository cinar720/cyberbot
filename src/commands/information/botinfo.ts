import { SlashCommandBuilder, version as discordVersion } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { main } from '../../config/main.js';
import type { SlashCommand } from '../../types/command.js';
import { getPrisma } from '../../services/database/index.js';
import { formatNumber } from '../../utils/helpers.js';

export default {
  metadata: {
    name: 'botinfo',
    description: 'Bot hakkında bilgi verir.',
    category: 'information',
    cooldown: 5,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('botinfo')
    .setDescription('Bot hakkında bilgi verir.'),

  async execute({ interaction, client }) {
    const uptime = formatUptime(process.uptime());
    const memory = process.memoryUsage();

    const db = getPrisma();
    const guildCount = await db.guild.count();
    const warningCount = await db.warning.count();

    const embed = CyberEmbed.info(`${main.botName} Bot Bilgisi`)
      .addFields(
        { name: 'İstatistikler', value: [
          `Sunucu: \`${client.guilds.cache.size}\``,
          `Kullanıcı: \`${formatNumber(client.users.cache.size)}\``,
          `Kanal: \`${client.channels.cache.size}\``,
        ].join('\n'), inline: true },
        { name: 'Sistem', value: [
          `Uptime: \`${uptime}\``,
          `Bellek: \`${(memory.heapUsed / 1024 / 1024).toFixed(1)} MB\``,
          `Node.js: \`${process.version}\``,
        ].join('\n'), inline: true },
        { name: 'Bağlantılar', value: [
          `Discord.js: \`v${discordVersion}\``,
          `Tür: \`Slash Command\``,
          `Prefix: \`${main.prefix}\``,
        ].join('\n'), inline: true },
        { name: 'Veritabanı', value: [
          `Sunucu: \`${guildCount}\``,
          `Uyarı: \`${warningCount}\``,
        ].join('\n'), inline: true },
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
