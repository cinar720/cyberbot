import { readdirSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import { createChildLogger } from '../utils/logger.js';
import type { Client } from 'discord.js';

const log = createChildLogger('EVENTS');

export interface EventFile {
  name: string;
  once?: boolean;
  execute: (...args: unknown[]) => Promise<void>;
}

export async function loadEvents(client: Client): Promise<void> {
  const eventsDir = join(import.meta.dirname!, '..', 'events');
  const entries = readdirSync(eventsDir, { withFileTypes: true });

  let count = 0;

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const categoryDir = join(eventsDir, entry.name);
    const files = readdirSync(categoryDir).filter((f) => f.endsWith('.ts') || f.endsWith('.js'));

    for (const file of files) {
      try {
        const filePath = join(categoryDir, file);
        const mod = await import(pathToFileURL(filePath).href);
        const event: EventFile = mod.default;

        if (event?.name) {
          if (event.once) {
            client.once(event.name, (...args: unknown[]) => event.execute(...args));
          } else {
            client.on(event.name, (...args: unknown[]) => event.execute(...args));
          }
          count++;
          log.debug('Loaded: %s', event.name);
        }
      } catch (error) {
        log.error(
          'Failed to load event %s/%s: %s',
          entry.name,
          file,
          error instanceof Error ? error.message : String(error),
        );
      }
    }
  }

  log.info('%d events loaded.', count);
}
