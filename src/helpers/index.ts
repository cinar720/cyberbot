import { Guild, GuildMember, TextChannel, ChannelType } from 'discord.js';
import { Logger } from '../utils/logger.js';

const log = new Logger('HELPER');

export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} gün`;
  if (hours > 0) return `${hours} saat`;
  if (minutes > 0) return `${minutes} dakika`;
  return `${seconds} saniye`;
}

export function parseDuration(input: string): number | null {
  const regex = /^(\d+)(s|m|h|d|saniye|dakika|saat|gun|gün)$/i;
  const match = input.match(regex);

  if (!match) return null;

  const value = parseInt(match[1]!, 10);
  const unit = match[2]!.toLowerCase();

  const multipliers: Record<string, number> = {
    s: 1000,
    m: 60000,
    h: 3600000,
    d: 86400000,
    saniye: 1000,
    dakika: 60000,
    saat: 3600000,
    gun: 86400000,
    gün: 86400000,
  };

  return value * (multipliers[unit] || 1000);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('tr-TR').format(num);
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length - 3) + '...';
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j]!, shuffled[i]!];
  }
  return shuffled;
}

export function getRandomItem<T>(array: T[]): T | undefined {
  return array[Math.floor(Math.random() * array.length)];
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function isNumber(value: unknown): boolean {
  return typeof value === 'number' && !isNaN(value);
}

export function isValidSnowflake(id: string): boolean {
  return /^\d{17,20}$/.test(id);
}

export function getChannel(guild: Guild, channelId: string): TextChannel | null {
  const channel = guild.channels.cache.get(channelId);
  if (channel && channel.type === ChannelType.GuildText) {
    return channel;
  }
  return null;
}

export async function sendDM(member: GuildMember, content: string): Promise<boolean> {
  try {
    await member.send(content);
    return true;
  } catch {
    log.debug(`DM gönderilemedi: ${member.user.tag}`);
    return false;
  }
}

export function resolveMember(guild: Guild, query: string): GuildMember | undefined {
  const mentionRegex = /^<@!?(\d+)>$/;
  const mentionMatch = query.match(mentionRegex);

  if (mentionMatch) {
    return guild.members.cache.get(mentionMatch[1]!);
  }

  if (/^\d{17,20}$/.test(query)) {
    return guild.members.cache.get(query);
  }

  const lowerQuery = query.toLowerCase();
  return guild.members.cache.find(
    (m) =>
      m.user.username.toLowerCase().includes(lowerQuery) ||
      m.user.tag.toLowerCase().includes(lowerQuery) ||
      (m.nickname && m.nickname.toLowerCase().includes(lowerQuery)),
  );
}
