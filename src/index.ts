import { config } from 'dotenv';
config();

import {
  createClient,
  loadEvents,
  loadButtons,
  loadModals,
  loadSelectMenus,
  loadAutocompleteHandlers,
  loadContextMenus,
} from './handlers/index.js';
import { connectDatabase, disconnectDatabase } from './services/database/index.js';
import { Logger } from './utils/logger.js';
import { main } from './config/main.js';
import { CommandRegistry } from './structures/CommandRegistry.js';
import { CommandHandler } from './structures/CommandHandler.js';
import { createWebServer } from './web/server.js';
import { setDiscordClient } from './web/discord-client.js';
import { validateEnv } from './utils/env.js';

const log = new Logger('BOT');

async function bootstrap(): Promise<void> {
  try {
    validateEnv();

    log.info('=================================');
    log.info(`   ${main.botName} v${main.botVersion}`);
    log.info('   Premium Discord Moderation Bot');
    log.info('=================================');
    log.info('');

    log.info('Veritabanına bağlanılıyor...');
    await connectDatabase();

    log.info('Discord istemcisi oluşturuluyor...');
    const client = createClient();

    log.info('Command Registry oluşturuluyor...');
    const registry = new CommandRegistry(main.token, main.clientId);

    log.info('Command Handler yükleniyor...');
    const commandHandler = new CommandHandler(registry);
    await commandHandler.loadCommands(client);

    if (main.isDevelopment) {
      log.info('Geliştirme modunda komutlar kaydediliyor...');
      if (main.guildId) {
        await commandHandler.registerCommands(client, main.guildId);
      } else {
        await commandHandler.registerCommands(client);
      }
    }

    log.info('Event\'lar yükleniyor...');
    await loadEvents(client);

    log.info('Component\'lar yükleniyor...');
    await loadButtons(client);
    await loadModals(client);
    await loadSelectMenus(client);
    await loadAutocompleteHandlers(client);
    await loadContextMenus(client);

    log.info('Discord\'a bağlanılıyor...');
    await client.login(main.token);

    setDiscordClient(client);

    log.info('Web paneli başlatılıyor...');
    createWebServer();

    process.on('SIGINT', async () => {
      log.info('Kapatma sinyali alındı. Temizleniyor...');
      await disconnectDatabase();
      client.destroy();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      log.info('TERM sinyali alındı. Temizleniyor...');
      await disconnectDatabase();
      client.destroy();
      process.exit(0);
    });

    process.on('unhandledRejection', (reason: unknown) => {
      log.error('Unhandled Rejection:', reason);
    });

    process.on('uncaughtException', (error: Error) => {
      log.fatal('Uncaught Exception:', error);
    });
  } catch (error) {
    log.fatal('Başlatma hatası:', error);
  }
}

bootstrap();
