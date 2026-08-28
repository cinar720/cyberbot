import { EmbedBuilder, type Client, type Message, type TextChannel } from 'discord.js';
import { getEnv } from '../config/env.js';
import { createChildLogger } from '../utils/logger.js';
import { Emojis } from '../config/emojis.js';
import os from 'node:os';

const log = createChildLogger('STATUS');

let statusMessage: Message | null = null;
let statusChannel: TextChannel | null = null;
let client: Client | null = null;
let dbConnected = false;
let commandCount = 0;
let voiceConnected = false;

const UPDATE_INTERVAL = 60_000;
let updateTimer: ReturnType<typeof setInterval> | null = null;

export async function initStatusService(
  discordClient: Client,
  isDbConnected: boolean,
): Promise<void> {
  client = discordClient;
  dbConnected = isDbConnected;

  const env = getEnv();
  if (!env.BOT_PING_CHANNEL_ID) {
    log.warn('BOT_PING_CHANNEL_ID ayarlanmamış. Durum servisi devre dışı.');
    return;
  }

  let channel;
  try {
    channel = await discordClient.channels.fetch(env.BOT_PING_CHANNEL_ID);
  } catch {
    channel = null;
    log.warn('BOT_PING_CHANNEL_ID kanalına erişilemedi.');
  }

  if (!channel || !channel.isTextBased()) {
    log.warn('BOT_PING_CHANNEL_ID kanalı bulunamadı veya metin tabanlı değil.');
    return;
  }

  statusChannel = channel as TextChannel;
  log.info('Durum servisi başlatıldı.');
}

export function setDbConnected(connected: boolean): void {
  dbConnected = connected;
}

export function setCommandCount(count: number): void {
  commandCount = count;
}

export function getCommandCount(): number {
  return commandCount;
}

export function setVoiceConnected(connected: boolean): void {
  voiceConnected = connected;
}

export async function startStatusLoop(): Promise<void> {
  if (!statusChannel || !client) return;

  await updateStatusMessage();

  updateTimer = setInterval(() => {
    void updateStatusMessage();
  }, UPDATE_INTERVAL);
}

export function stopStatusLoop(): void {
  if (updateTimer) {
    clearInterval(updateTimer);
    updateTimer = null;
  }
}

function getUptime(): string {
  if (!client) return '0s';
  const uptime = client.uptime ?? 0;
  const seconds = Math.floor(uptime / 1000) % 60;
  const minutes = Math.floor(uptime / 60000) % 60;
  const hours = Math.floor(uptime / 3600000) % 24;
  const days = Math.floor(uptime / 86400000);

  const parts: string[] = [];
  if (days > 0) parts.push(`${days}g`);
  if (hours > 0) parts.push(`${hours}sa`);
  if (minutes > 0) parts.push(`${minutes}dk`);
  parts.push(`${seconds}s`);
  return parts.join(' ');
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
  const usage = ((total - idle) / total) * 100;

  return `%${usage.toFixed(1)}`;
}

function getMemoryUsage(): string {
  const total = os.totalmem();
  const free = os.freemem();
  const used = total - free;
  return `${(used / 1024 / 1024 / 1024).toFixed(1)} / ${(total / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

function getProcessMemory(): string {
  const mem = process.memoryUsage();
  return `${(mem.heapUsed / 1024 / 1024).toFixed(1)} MB`;
}

function buildStatusEmbed(): EmbedBuilder {
  const guildCount = client?.guilds.cache.size ?? 0;
  const userCount = client?.guilds.cache.reduce((acc, g) => acc + g.memberCount, 0) ?? 0;
  const wsPing = client?.ws.ping ?? 0;

  const dbStatus = dbConnected ? `${Emojis.check} Bağlı` : `${Emojis.cross} Bağlı Değil`;
  const voiceStatus = voiceConnected ? `${Emojis.check} Bağlı` : `${Emojis.cross} Bağlı Değil`;
  const overallStatus = dbConnected && wsPing > 0 ? 'Çevrimiçi' : 'Sorunlu';
  const statusColor = dbConnected && wsPing > 0 ? 0x57f287 : 0xfee75c;
  const statusEmoji = dbConnected && wsPing > 0 ? Emojis.basari : Emojis.uyari;

  const nodeVersion = process.version;
  const djsVersion = '14.27.0';
  const platform = `${os.platform()} ${os.release()}`;
  const cpuModel = os.cpus()[0]?.model ?? 'Bilinmiyor';

  return new EmbedBuilder()
    .setColor(statusColor)
    .setTitle(`${statusEmoji} CyberBOT Durumu`)
    .setDescription(`**Durum:** ${overallStatus}`)
    .addFields(
      {
        name: `${Emojis.bot} Discord`,
        value: [
          `${Emojis.shield} **WebSocket Gecikmesi:** ${wsPing}ms`,
          `${Emojis.server} **Sunucu Sayısı:** ${guildCount.toLocaleString()}`,
          `${Emojis.users} **Kullanıcı Sayısı:** ${userCount.toLocaleString()}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: `${Emojis.settings} Sistem`,
        value: [
          `${Emojis.clock} **Çalışma Süresi:** ${getUptime()}`,
          `${Emojis.power} **Node.js:** ${nodeVersion}`,
          `${Emojis.party} **discord.js:** ${djsVersion}`,
          `${Emojis.fire} **İşlemci:** ${getCpuUsage()}`,
          `${Emojis.channel} **Bellek:** ${getMemoryUsage()}`,
          `${Emojis.search} **İşlem Belleği:** ${getProcessMemory()}`,
        ].join('\n'),
        inline: true,
      },
      {
        name: `${Emojis.server} Platform`,
        value: [
          `${Emojis.settings} **İşletim Sistemi:** ${platform}`,
          `${Emojis.power} **İşlemci Modeli:** ${cpuModel}`,
        ].join('\n'),
        inline: false,
      },
      {
        name: `${Emojis.shield} Veritabanı`,
        value: dbStatus,
        inline: true,
      },
      {
        name: `${Emojis.channel} Ses`,
        value: voiceStatus,
        inline: true,
      },
      {
        name: `${Emojis.crown} CyberBOT`,
        value: [
          `${Emojis.link} **Yüklü Komut Sayısı:** ${commandCount}`,
          `${Emojis.user} **Bot ID:** ${client?.user?.id ?? 'Bilinmiyor'}`,
        ].join('\n'),
        inline: true,
      },
    )
    .setFooter({ text: 'Son güncelleme' })
    .setTimestamp(new Date());
}

async function updateStatusMessage(): Promise<void> {
  if (!statusChannel) return;

  try {
    if (statusMessage) {
      await statusMessage.edit({ embeds: [buildStatusEmbed()] });
    } else {
      const messages = await statusChannel.messages.fetch({ limit: 20 });
      const existing = messages.find(
        (m) => m.author.id === client?.user?.id && m.embeds.length > 0,
      );

      if (existing) {
        statusMessage = existing;
        await statusMessage.edit({ embeds: [buildStatusEmbed()] });
      } else {
        statusMessage = await statusChannel.send({ embeds: [buildStatusEmbed()] });
      }
    }
  } catch (error) {
    log.error(
      'Durum mesajı güncellenemedi: %s',
      error instanceof Error ? error.message : String(error),
    );
    statusMessage = null;
  }
}
