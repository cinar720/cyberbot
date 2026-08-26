import { EmbedBuilder, type Client } from 'discord.js';
import { colors } from '../config/colors.js';
import { main } from '../config/main.js';

const MAX_ERROR_LENGTH = 900;

function getErrorText(error: unknown): string {
  if (error instanceof Error) return error.stack || error.message;
  return String(error);
}

export async function reportError(
  client: Client,
  context: string,
  error: unknown,
  details?: string,
): Promise<void> {
  const channelId = process.env.ERROR_LOG_CHANNEL_ID;
  if (!channelId) return;

  try {
    const errorText = getErrorText(error).slice(0, MAX_ERROR_LENGTH);
    const embed = new EmbedBuilder()
      .setTitle('CyberBOT Hata Kaydı')
      .setColor(colors.error)
      .addFields(
        { name: 'Bölüm', value: context.slice(0, 256), inline: true },
        { name: 'Zaman', value: `<t:${Math.floor(Date.now() / 1000)}:F>`, inline: true },
        { name: 'Hata', value: `\`\`\`\n${errorText}\n\`\`\`` },
      )
      .setFooter({ text: main.botName });

    if (details) embed.addFields({ name: 'Detay', value: details.slice(0, 512) });

    const channel = await client.channels.fetch(channelId).catch(() => null);
    if (channel && channel.isTextBased() && 'send' in channel) {
      await channel.send({ embeds: [embed] }).catch(() => null);
    }

    if (main.ownerId) {
      const owner = await client.users.fetch(main.ownerId).catch(() => null);
      if (owner) await owner.send({ embeds: [embed] }).catch(() => null);
    }
  } catch {
    // Error reporting must never create another unhandled error.
  }
}
