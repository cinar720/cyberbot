import {
  Events,
  type Client,
  type TextChannel,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
} from 'discord.js';
import { initDiscordLogger } from '../../services/logger/discord.js';
import { initStatusService, startStatusLoop, getCommandCount } from '../../services/status.js';
import { setupRules } from '../../services/rules.js';
import { setupSupportPanels } from '../../services/support.js';
import { getEnv } from '../../config/env.js';
import { createChildLogger } from '../../utils/logger.js';
import { Emojis } from '../../config/emojis.js';
import { getSystemMemoryInfo, formatMemoryModules } from '../../utils/sysinfo.js';
import os from 'node:os';

const log = createChildLogger('READY');

function formatBytes(bytes: number): string {
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getCpuUsage(): string {
  const cpus = os.cpus();
  let totalIdle = 0;
  let totalTick = 0;
  for (const cpu of cpus) {
    for (const type in cpu.times) {
      totalTick += cpu.times[type as keyof typeof cpu.times];
    }
    totalIdle += cpu.times.idle;
  }
  const idle = totalIdle / cpus.length;
  const total = totalTick / cpus.length;
  return `${(((total - idle) / total) * 100).toFixed(1)}%`;
}

function buildStartupContainer(
  tag: string,
  guildCount: number,
  userCount: number,
  ping: number,
  commandCount: number,
  uptime: string,
): ContainerBuilder {
  const totalMem = os.totalmem();
  const usedMem = totalMem - os.freemem();
  const memInfo = getSystemMemoryInfo();

  return new ContainerBuilder()
    .setAccentColor(0x57f287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.party} CyberBOT Başlatıldı`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `${Emojis.bot} **Bot:** ${tag}`,
          `${Emojis.server} **Sunucu:** ${guildCount}`,
          `${Emojis.users} **Kullanıcı:** ${userCount.toLocaleString('tr-TR')}`,
          `${Emojis.link} **Komut:** ${commandCount}`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `${Emojis.shield} **Gecikme:** ${ping}ms`,
          `${Emojis.clock} **Çalışma Süresi:** ${uptime}`,
          `${Emojis.settings} **Node.js:** ${process.version}`,
          `${Emojis.power} **discord.js:** v14`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `${Emojis.fire} **İşlemci Adı:** ${os.cpus()[0]?.model ?? 'Bilinmiyor'}`,
          `${Emojis.power} **İşlemci Çekirdeği:** ${os.cpus().length} (${getCpuUsage()})`,
          `${Emojis.channel} **Bellek (Kullanılan/Toplam):** ${formatBytes(usedMem)} / ${formatBytes(totalMem)}`,
          `${Emojis.settings} **RAM Türü:** ${formatMemoryModules(memInfo)}`,
          `${Emojis.search} **İşlem Belleği:** ${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(1)} MB`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${Emojis.calendar} <t:${Math.floor(Date.now() / 1000)}:F>`,
      ),
    );
}

function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}g ${hours % 24}sa ${minutes % 60}dk`;
  if (hours > 0) return `${hours}sa ${minutes % 60}dk`;
  if (minutes > 0) return `${minutes}dk ${seconds % 60}sn`;
  return `${seconds}sn`;
}

export default {
  name: Events.ClientReady,
  once: true,
  async execute(client: Client): Promise<void> {
    log.info('Bot ready as %s', client.user?.tag);

    const env = getEnv();
    const guildCount = client.guilds.cache.size;
    const userCount = client.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0);

    initDiscordLogger(client);
    await initStatusService(client, true);
    await startStatusLoop();

    await setupRules(client);
    await setupSupportPanels(client);

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const ping = client.ws.ping;
    const uptime = formatUptime(client.uptime ?? 0);

    const startupChannelId = env.BOT_STARTUP_CHANNEL_ID;
    if (startupChannelId) {
      try {
        const channel = await client.channels.fetch(startupChannelId);
        if (channel && channel.isTextBased() && 'send' in channel) {
          const container = buildStartupContainer(
            client.user?.tag ?? 'CyberBOT',
            guildCount,
            userCount,
            ping,
            getCommandCount(),
            uptime,
          );

          const textChannel = channel as TextChannel;
          await textChannel.send({
            components: [container],
            flags: 32768,
          });

          log.info('Startup log sent to channel %s', startupChannelId);
        }
      } catch (error) {
        log.error(
          'Failed to send startup log: %s',
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  },
};
