import {
  EmbedBuilder,
  ContainerBuilder,
  type Client,
  type TextChannel,
  type MessageCreateOptions,
} from 'discord.js';
import { getEnv } from '../../config/env.js';
import { createChildLogger } from '../../utils/logger.js';

const log = createChildLogger('DISCORD-LOG');

interface LogEntry {
  channelKey: string;
  payload: MessageCreateOptions;
}

const queue: LogEntry[] = [];
let processing = false;
let client: Client | null = null;

const SEND_INTERVAL = 1000;
let lastSendTime = 0;

export function initDiscordLogger(discordClient: Client): void {
  client = discordClient;
  log.info('Discord logger initialized.');
}

function getChannel(key: string): TextChannel | null {
  if (!client) return null;

  const env = getEnv();
  const channelId =
    key === 'bot'
      ? env.BOT_LOG_CHANNEL_ID
      : key === 'error'
        ? env.ERROR_LOG_CHANNEL_ID
        : key === 'ping'
          ? env.BOT_PING_CHANNEL_ID
          : key === 'mod'
            ? env.MOD_LOG_CHANNEL_ID
            : null;

  if (!channelId) return null;

  const channel = client.channels.cache.get(channelId);
  if (!channel || !channel.isTextBased()) {
    log.warn('Channel not found or not text-based: %s', key);
    return null;
  }

  return channel as TextChannel;
}

function formatEmbed(embed: EmbedBuilder): EmbedBuilder {
  return embed.setTimestamp(new Date());
}

export async function sendBotLog(
  embed?: EmbedBuilder,
  containers?: ContainerBuilder[],
): Promise<void> {
  const payload: MessageCreateOptions = {};

  if (containers && containers.length > 0) {
    payload.components = containers;
    payload.flags = 32768;
  } else if (embed) {
    payload.embeds = [formatEmbed(embed)];
  } else {
    return;
  }

  queue.push({ channelKey: 'bot', payload });
  void processQueue();
}

export async function sendModLog(
  embed?: EmbedBuilder,
  containers?: ContainerBuilder[],
): Promise<void> {
  const payload: MessageCreateOptions = {};

  if (containers && containers.length > 0) {
    payload.components = containers;
    payload.flags = 32768;
  } else if (embed) {
    payload.embeds = [formatEmbed(embed)];
  } else {
    return;
  }

  queue.push({ channelKey: 'mod', payload });
  void processQueue();
}

export async function sendErrorLog(embed: EmbedBuilder): Promise<void> {
  queue.push({
    channelKey: 'error',
    payload: { embeds: [formatEmbed(embed)] },
  });
  void processQueue();
}

async function processQueue(): Promise<void> {
  if (processing || queue.length === 0) return;
  processing = true;

  while (queue.length > 0) {
    const now = Date.now();
    const elapsed = now - lastSendTime;
    if (elapsed < SEND_INTERVAL) {
      await sleep(SEND_INTERVAL - elapsed);
    }

    const entry = queue.shift();
    if (!entry) continue;

    const channel = getChannel(entry.channelKey);
    if (!channel) continue;

    try {
      await channel.send(entry.payload);
      lastSendTime = Date.now();
    } catch (error) {
      log.error(
        'Failed to send log to %s: %s',
        entry.channelKey,
        error instanceof Error ? error.message : String(error),
      );
    }
  }

  processing = false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function createEmbed(color: number, title: string, description?: string): EmbedBuilder {
  const embed = new EmbedBuilder().setColor(color).setTitle(title);
  if (description) embed.setDescription(description);
  return embed;
}

export const LogColors = {
  SUCCESS: 0x57f287,
  INFO: 0x5865f2,
  WARNING: 0xfee75c,
  ERROR: 0xed4245,
} as const;
