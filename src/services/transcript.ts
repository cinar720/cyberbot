import { type Message, type TextBasedChannel } from 'discord.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('TRANSCRIPT');

const MAX_MESSAGES = 200;

export interface TranscriptData {
  text: string;
  count: number;
}

/**
 * Generates a plain-text transcript of the recent messages in a channel.
 * Never throws; returns an empty transcript on failure.
 */
export async function generateTranscript(
  channel: TextBasedChannel,
  limit = MAX_MESSAGES,
): Promise<TranscriptData> {
  try {
    const messages = await channel.messages.fetch({ limit });
    const sorted = [...messages.values()].sort((a, b) => a.createdTimestamp - b.createdTimestamp);

    const lines = sorted.map((m: Message) => {
      const author = m.author ? `${m.author.username}` : 'Bilinmeyen';
      const attachmentCount = m.attachments.size;
      const content = m.content || (attachmentCount ? `[${attachmentCount} ek dosya]` : '');
      const stamp = m.createdAt.toLocaleString('tr-TR');
      return `[${stamp}] ${author}: ${content}`;
    });

    log.info('Transcript generated: %d messages', lines.length);
    return { text: lines.join('\n'), count: lines.length };
  } catch (error) {
    log.error(
      'Failed to generate transcript: %s',
      error instanceof Error ? error.message : String(error),
    );
    return { text: '', count: 0 };
  }
}
