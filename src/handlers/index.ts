import { Client, Collection, Partials } from 'discord.js';
import { Logger } from '../utils/logger.js';
import type { CyberBotClient } from '../types/command.js';
import type { CyberClient } from '../types/index.js';
import { readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = resolve(__filename, '..');

export function createClient(): CyberBotClient {
  const client = new Client({
    intents: [
      'Guilds',
      'GuildMembers',
      'GuildMessages',
      'GuildVoiceStates',
      'GuildPresences',
      'MessageContent',
      'GuildMessageReactions',
      'DirectMessages',
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember, Partials.User, Partials.Reaction],
  }) as CyberBotClient;

  client.commands = new Collection();
  client.cooldowns = new Collection();
  client.slashCommands = new Collection();
  client.buttons = new Collection();
  client.modals = new Collection();
  client.selectMenus = new Collection();
  client.autocompleteHandlers = new Collection();
  client.contextMenus = new Collection();

  return client;
}

export async function loadEvents(client: Client): Promise<void> {
  const log = new Logger('EVENT');
  const eventsPath = join(__dirname, '..', 'events');

  try {
    const eventFiles = readdirSync(eventsPath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
    );

    for (const file of eventFiles) {
      const filePath = join(eventsPath, file);
      try {
        const event = await import(pathToFileURL(filePath).href);
        const evt = event.default || event;

        if (evt.name && evt.execute) {
          if (evt.once) {
            client.once(evt.name, (...args: unknown[]) => evt.execute(...args));
          } else {
            client.on(evt.name, (...args: unknown[]) => evt.execute(...args));
          }
          log.info(`Yüklenen event: ${evt.name}`);
        }
      } catch (error) {
        log.error(`Event yükleme hatası: ${filePath}`, error);
      }
    }

    log.success(`${eventFiles.length} event yüklendi.`);
  } catch (error) {
    log.error('Event klasörü okuma hatası.', error);
  }
}

export async function loadCommands(client: Client): Promise<void> {
  const log = new Logger('COMMAND');
  const commandsPath = join(__dirname, '..', 'commands');
  const cyberClient = client as unknown as CyberClient;

  try {
    const items = readdirSync(commandsPath);

    for (const item of items) {
      const itemPath = join(commandsPath, item);
      const stat = statSync(itemPath);

      if (stat.isDirectory()) {
        const commandFiles = readdirSync(itemPath).filter(
          (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
        );

        for (const file of commandFiles) {
          const filePath = join(itemPath, file);
          try {
            const command = await import(pathToFileURL(filePath).href);
            const cmd = command.default || command;

            if (cmd.name) {
              cyberClient.commands.set(cmd.name, cmd);
              log.info(`Yüklenen komut: ${cmd.name} [${item}]`);
            }
          } catch (error) {
            log.error(`Komut yükleme hatası: ${filePath}`, error);
          }
        }
      }
    }

    log.success(`${cyberClient.commands.size} komut yüklendi.`);
  } catch (error) {
    log.error('Komut klasörü okuma hatası.', error);
  }
}

export async function loadSlashCommands(client: Client): Promise<void> {
  const log = new Logger('HANDLER');
  const commandsPath = join(__dirname, '..', 'commands');
  const cyberClient = client as unknown as CyberClient;

  try {
    const items = readdirSync(commandsPath);

    for (const item of items) {
      const itemPath = join(commandsPath, item);
      const stat = statSync(itemPath);

      if (stat.isDirectory()) {
        const commandFiles = readdirSync(itemPath).filter(
          (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
        );

        for (const file of commandFiles) {
          const filePath = join(itemPath, file);
          try {
            const command = await import(pathToFileURL(filePath).href);
            const cmd = command.default || command;

            if (cmd.data && cmd.execute) {
              cyberClient.slashCommands.set(cmd.data.name, cmd);
            }
          } catch (error) {
            log.error(`Slash komut yükleme hatası: ${filePath}`, error);
          }
        }
      }
    }

    log.success(`${cyberClient.slashCommands.size} slash komut yüklendi.`);
  } catch (error) {
    log.error('Slash komut klasörü okuma hatası.', error);
  }
}

export async function loadButtons(client: Client): Promise<void> {
  const log = new Logger('BUTTON');
  const buttonsPath = join(__dirname, '..', 'components', 'buttons');
  const cyberClient = client as unknown as CyberClient;

  if (!existsSync(buttonsPath)) return;

  try {
    const buttonFiles = readdirSync(buttonsPath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
    );

    for (const file of buttonFiles) {
      const filePath = join(buttonsPath, file);
      try {
        const button = await import(pathToFileURL(filePath).href);
        const btn = button.default || button;

        if (btn.id && btn.execute) {
          cyberClient.buttons.set(btn.id, btn);
          log.info(`Yüklenen buton: ${btn.id}`);
        }
      } catch (error) {
        log.error(`Buton yükleme hatası: ${filePath}`, error);
      }
    }

    log.success(`${cyberClient.buttons.size} buton yüklendi.`);
  } catch (error) {
    log.error('Buton klasörü okuma hatası.', error);
  }
}

export async function loadModals(client: Client): Promise<void> {
  const log = new Logger('MODAL');
  const modalsPath = join(__dirname, '..', 'components', 'modals');
  const cyberClient = client as unknown as CyberClient;

  if (!existsSync(modalsPath)) return;

  try {
    const modalFiles = readdirSync(modalsPath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
    );

    for (const file of modalFiles) {
      const filePath = join(modalsPath, file);
      try {
        const modal = await import(pathToFileURL(filePath).href);
        const md = modal.default || modal;

        if (md.id && md.execute) {
          cyberClient.modals.set(md.id, md);
          log.info(`Yüklenen modal: ${md.id}`);
        }
      } catch (error) {
        log.error(`Modal yükleme hatası: ${filePath}`, error);
      }
    }

    log.success(`${cyberClient.modals.size} modal yüklendi.`);
  } catch (error) {
    log.error('Modal klasörü okuma hatası.', error);
  }
}

export async function loadSelectMenus(client: Client): Promise<void> {
  const log = new Logger('SELECT');
  const selectMenusPath = join(__dirname, '..', 'components', 'selectMenus');
  const cyberClient = client as unknown as CyberClient;

  if (!existsSync(selectMenusPath)) return;

  try {
    const selectFiles = readdirSync(selectMenusPath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
    );

    for (const file of selectFiles) {
      const filePath = join(selectMenusPath, file);
      try {
        const select = await import(pathToFileURL(filePath).href);
        const sel = select.default || select;

        if (sel.id && sel.execute) {
          cyberClient.selectMenus.set(sel.id, sel);
          log.info(`Yüklenen select menu: ${sel.id}`);
        }
      } catch (error) {
        log.error(`Select menu yükleme hatası: ${filePath}`, error);
      }
    }

    log.success(`${cyberClient.selectMenus.size} select menu yüklendi.`);
  } catch (error) {
    log.error('Select menu klasörü okuma hatası.', error);
  }
}

export async function loadAutocompleteHandlers(client: Client): Promise<void> {
  const log = new Logger('HANDLER');
  const autocompletePath = join(__dirname, '..', 'components', 'autocomplete');
  const cyberClient = client as unknown as CyberClient;

  if (!existsSync(autocompletePath)) return;

  try {
    const autoFiles = readdirSync(autocompletePath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
    );

    for (const file of autoFiles) {
      const filePath = join(autocompletePath, file);
      try {
        const auto = await import(pathToFileURL(filePath).href);
        const ac = auto.default || auto;

        if (ac.name && ac.execute) {
          cyberClient.autocompleteHandlers.set(ac.name, ac);
          log.info(`Yüklenen autocomplete: ${ac.name}`);
        }
      } catch (error) {
        log.error(`Autocomplete yükleme hatası: ${filePath}`, error);
      }
    }

    log.success(`${cyberClient.autocompleteHandlers.size} autocomplete yüklendi.`);
  } catch (error) {
    log.error('Autocomplete klasörü okuma hatası.', error);
  }
}

export async function loadContextMenus(client: Client): Promise<void> {
  const log = new Logger('HANDLER');
  const contextPath = join(__dirname, '..', 'components', 'contextMenus');
  const cyberClient = client as unknown as CyberClient;

  if (!existsSync(contextPath)) return;

  try {
    const contextFiles = readdirSync(contextPath).filter(
      (f) => (f.endsWith('.ts') || f.endsWith('.js')) && !f.endsWith('.d.ts'),
    );

    for (const file of contextFiles) {
      const filePath = join(contextPath, file);
      try {
        const ctx = await import(pathToFileURL(filePath).href);
        const contextMenu = ctx.default || ctx;

        if (contextMenu.name && contextMenu.execute) {
          cyberClient.contextMenus.set(contextMenu.name, contextMenu);
          log.info(`Yüklenen context menu: ${contextMenu.name}`);
        }
      } catch (error) {
        log.error(`Context menu yükleme hatası: ${filePath}`, error);
      }
    }

    log.success(`${cyberClient.contextMenus.size} context menu yüklendi.`);
  } catch (error) {
    log.error('Context menu klasörü okuma hatası.', error);
  }
}
