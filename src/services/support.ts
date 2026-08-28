import { type Client, type TextChannel } from 'discord.js';
import { getEnv } from '../config/env.js';
import { createChildLogger } from '../utils/logger.js';
import { buildSuggestionInputPanel } from '../panels/suggestion.js';
import { buildTicketPanel } from '../panels/ticket.js';
import { buildAdvertisementPanel } from '../panels/advertisement.js';

const log = createChildLogger('SUPPORT');

async function getChannel(client: Client, channelId: string): Promise<TextChannel | null> {
  try {
    const ch = await client.channels.fetch(channelId);
    if (!ch || !ch.isTextBased()) return null;
    return ch as TextChannel;
  } catch {
    return null;
  }
}

async function sendOrUpdatePanel(
  channel: TextChannel,
  components: unknown[],
  client: Client,
): Promise<void> {
  try {
    const messages = await channel.messages.fetch({ limit: 20 });
    const existing = messages.find((m) => m.author.id === client.user?.id);

    if (existing) {
      await existing.edit({ components: components as never[] });
      log.info('Panel updated in %s', channel.name);
    } else {
      await channel.send({ components: components as never[], flags: 32768 });
      log.info('Panel sent to %s', channel.name);
    }
  } catch (error) {
    log.error(
      'Failed to send panel to %s: %s',
      channel.name,
      error instanceof Error ? error.message : String(error),
    );
  }
}

export async function setupSupportPanels(client: Client): Promise<void> {
  const env = getEnv();

  if (!env.SUPPORT_GUILD_ID) {
    log.warn('SUPPORT_GUILD_ID not set. Support panels skipped.');
    return;
  }

  let guild;
  try {
    guild = await client.guilds.fetch(env.SUPPORT_GUILD_ID);
  } catch {
    log.warn('Support guild not found.');
    return;
  }

  const botMember = await guild.members.fetch(client.user!.id).catch(() => null);
  if (!botMember) return;

  if (env.TICKET_SUPPORT_CHANNEL_ID) {
    const channel = await getChannel(client, env.TICKET_SUPPORT_CHANNEL_ID);
    if (channel) {
      const perms = channel.permissionsFor(botMember);
      if (perms?.has('SendMessages') && perms.has('ViewChannel')) {
        await sendOrUpdatePanel(channel, [buildTicketPanel()], client);
      } else {
        log.warn('Bot lacks permissions in ticket support channel.');
      }
    }
  }

  if (env.SUGGESTION_INPUT_CHANNEL_ID) {
    const channel = await getChannel(client, env.SUGGESTION_INPUT_CHANNEL_ID);
    if (channel) {
      const perms = channel.permissionsFor(botMember);
      if (perms?.has('SendMessages') && perms.has('ViewChannel')) {
        await sendOrUpdatePanel(channel, [buildSuggestionInputPanel()], client);
      } else {
        log.warn('Bot lacks permissions in suggestion input channel.');
      }
    }
  }

  if (env.ADVERTISEMENT_CHANNEL_ID) {
    const channel = await getChannel(client, env.ADVERTISEMENT_CHANNEL_ID);
    if (channel) {
      const perms = channel.permissionsFor(botMember);
      if (perms?.has('SendMessages') && perms.has('ViewChannel')) {
        await sendOrUpdatePanel(channel, [buildAdvertisementPanel()], client);
      } else {
        log.warn('Bot lacks permissions in advertisement channel.');
      }
    }
  }

  log.info('Support panels setup complete.');
}
