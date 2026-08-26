import { Client } from 'discord.js';
import { readdirSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Logger } from '../utils/logger.js';
import { CommandRegistry } from './CommandRegistry.js';
import type { SlashCommand, CyberBotClient } from '../types/command.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

const log = new Logger('COMMAND');

export class CommandHandler {
  private registry: CommandRegistry;

  constructor(registry: CommandRegistry) {
    this.registry = registry;
  }

  async loadCommands(client: Client): Promise<void> {
    const commandsPath = join(__dirname, '..', 'commands');
    const cyberClient = client as unknown as CyberBotClient;

    try {
      const categories = readdirSync(commandsPath).filter((item) => {
        const itemPath = join(commandsPath, item);
        return statSync(itemPath).isDirectory();
      });

      for (const category of categories) {
        const categoryPath = join(commandsPath, category);
        const commandFiles = readdirSync(categoryPath).filter(
          (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
        );

        for (const file of commandFiles) {
          const filePath = join(categoryPath, file);
          try {
            const commandModule = await import(pathToFileURL(filePath).href);
            const command: SlashCommand = commandModule.default || commandModule;

            if (!command.metadata || !command.data || !command.execute) {
              log.warn(`Geçersiz komut dosyası: ${filePath}`);
              continue;
            }

            if (command.metadata.enabled === false) {
              log.info(`Devre dışı komut atlandı: ${command.metadata.name}`);
              continue;
            }

            this.registry.addCommand(command);
            cyberClient.slashCommands.set(command.metadata.name, command);

            log.info(`Yüklenen komut: ${command.metadata.name} [${category}]`);
          } catch (error) {
            log.error(`Komut yükleme hatası: ${filePath}`, error);
          }
        }
      }

      log.success(`${this.registry.getAllCommands().length} komut yüklendi.`);
    } catch (error) {
      log.error('Komut klasörü okuma hatası.', error);
    }
  }

  async registerCommands(_client: Client, guildId?: string): Promise<void> {
    try {
      if (guildId) {
        await this.registry.registerGuild(guildId);
      } else {
        await this.registry.registerGlobal();
      }
    } catch (error) {
      log.error('Komut kaydetme hatası.', error);
    }
  }
}
