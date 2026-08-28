import { Client, GatewayIntentBits, Events } from 'discord.js';
import { joinVoiceChannel, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { validateEnv, getEnv } from './config/env.js';
import { createChildLogger } from './utils/logger.js';
import { connectDatabase, disconnectDatabase } from './services/database/index.js';
import { setupGlobalErrorHandlers } from './utils/errors.js';
import { CommandHandler } from './handlers/command.js';
import { loadEvents } from './handlers/event.js';
import {
  initDiscordLogger,
  sendBotLog,
  sendErrorLog,
  createEmbed,
  LogColors,
} from './services/logger/discord.js';
import {
  setDbConnected,
  stopStatusLoop,
  setCommandCount,
  setVoiceConnected,
} from './services/status.js';
import { setCommandHandler } from './events/interaction/interactionCreate.js';

const log = createChildLogger('BOT');

async function connectToVoiceChannel(client: Client): Promise<void> {
  const env = getEnv();
  if (!env.BOT_VOICE_CHANNEL_ID) {
    log.warn('BOT_VOICE_CHANNEL_ID not set. Voice connection skipped.');
    return;
  }

  try {
    const channel = await client.channels.fetch(env.BOT_VOICE_CHANNEL_ID);
    if (!channel || !channel.isVoiceBased()) {
      log.warn('BOT_VOICE_CHANNEL_ID channel not found or not voice-based.');
      return;
    }

    const connection = joinVoiceChannel({
      channelId: channel.id,
      guildId: channel.guild.id,
      adapterCreator: channel.guild.voiceAdapterCreator,
      selfDeaf: true,
      selfMute: false,
    });

    connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        try {
          connection.destroy();
        } catch {
          log.error('Failed to destroy voice connection.');
        }
      }
    });

    connection.on(VoiceConnectionStatus.Destroyed, () => {
      setVoiceConnected(false);
      log.warn('Voice connection destroyed. Attempting reconnect...');
      setTimeout(() => {
        void connectToVoiceChannel(client);
      }, 5_000);
    });

    await entersState(connection, VoiceConnectionStatus.Ready, 20_000);
    setVoiceConnected(true);
    log.info('Connected to voice channel: %s', channel.name);
  } catch (error) {
    setVoiceConnected(false);
    log.error(
      'Failed to connect to voice channel: %s',
      error instanceof Error ? error.message : String(error),
    );
  }
}

async function bootstrap(): Promise<void> {
  setupGlobalErrorHandlers();

  const env = validateEnv();

  log.info('=================================');
  log.info(`   ${env.BOT_NAME}`);
  log.info('   Premium Discord Moderation Bot');
  log.info('=================================');

  log.info('Connecting to database...');
  let dbOk = false;
  try {
    await connectDatabase();
    dbOk = true;
    log.info('Database connected.');
  } catch (error) {
    log.error(
      'Database connection failed: %s',
      error instanceof Error ? error.message : String(error),
    );
  }

  log.info('Creating Discord client...');
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
      GatewayIntentBits.GuildMembers,
      GatewayIntentBits.GuildVoiceStates,
    ],
  });

  log.info('Loading commands...');
  const commandHandler = new CommandHandler();
  await commandHandler.load();
  setCommandHandler(commandHandler);
  setCommandCount(commandHandler.commands.size);

  log.info('Loading events...');
  await loadEvents(client);

  log.info('Logging in...');
  await client.login(env.TOKEN);

  initDiscordLogger(client);
  setDbConnected(dbOk);

  log.info('Registering commands...');
  await commandHandler.register(client);

  await connectToVoiceChannel(client);

  log.info('%s is ready!', env.BOT_NAME);

  const shutdown = async () => {
    log.info('Shutting down...');
    stopStatusLoop();

    const shutdownEmbed = createEmbed(LogColors.WARNING, 'Bot Kapatılıyor');
    await sendBotLog(shutdownEmbed).catch(() => null);

    await disconnectDatabase();
    client.destroy();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  client.on(Events.Error, (error) => {
    log.error('Client error: %s', error.message);
    const embed = createEmbed(LogColors.ERROR, 'Client HATASI', error.message);
    void sendErrorLog(embed);
  });

  client.on(Events.ShardDisconnect, (_event, shardId) => {
    log.warn('Shard %d disconnected.', shardId);
  });

  client.on(Events.ShardReconnecting, (shardId) => {
    log.info('Shard %d reconnecting...', shardId);
  });
}

bootstrap().catch((error) => {
  log.fatal('Startup failed: %s', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
