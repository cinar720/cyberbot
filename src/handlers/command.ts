import { Collection } from 'discord.js';
import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { createChildLogger } from '../utils/logger.js';
import type { Client } from 'discord.js';
import type { SlashCommand } from '../types/command.js';

const log = createChildLogger('COMMANDS');

export class CommandHandler {
  public commands = new Collection<string, SlashCommand>();

  async load(): Promise<void> {
    const commandsDir = join(import.meta.dirname!, '..', 'commands');
    const entries = readdirSync(commandsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const categoryDir = join(commandsDir, entry.name);
      const files = readdirSync(categoryDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

      for (const file of files) {
        try {
          const filePath = join(categoryDir, file);
          const mod = await import(pathToFileURL(filePath).href);
          const command: SlashCommand = mod.default;

          if (command?.metadata?.name) {
            this.commands.set(command.metadata.name, command);
            log.debug('Loaded: %s', command.metadata.name);
          }
        } catch (error) {
          log.error(
            'Failed to load %s/%s: %s',
            entry.name,
            file,
            error instanceof Error ? error.message : String(error),
          );
        }
      }
    }

    log.info('%d commands loaded.', this.commands.size);
  }

  async register(client: Client): Promise<void> {
    const data = this.commands.map((cmd) => cmd.data.toJSON());

    try {
      await client.application!.commands.set(data);
      log.info('%d commands registered globally.', data.length);
    } catch (error) {
      log.error(
        'Failed to register commands: %s',
        error instanceof Error ? error.message : String(error),
      );
    }
  }
}
