import { REST, Routes, Collection } from 'discord.js';
import { Logger } from '../utils/logger.js';
import type { SlashCommand } from '../types/command.js';

const log = new Logger('REGISTER');

export class CommandRegistry {
  private commands: Collection<string, SlashCommand> = new Collection();
  private rest: REST;
  private clientId: string;

  constructor(token: string, clientId: string) {
    this.rest = new REST({ version: '10' }).setToken(token);
    this.clientId = clientId;
  }

  addCommand(command: SlashCommand): void {
    this.commands.set(command.metadata.name, command);
  }

  getCommand(name: string): SlashCommand | undefined {
    return this.commands.get(name);
  }

  getAllCommands(): SlashCommand[] {
    return Array.from(this.commands.values());
  }

  async registerGlobal(): Promise<void> {
    try {
      log.info(`${this.commands.size} komut Discord'a kaydediliyor (global)...`);

      const body = this.commands.map((cmd) => cmd.data.toJSON());

      const data = await this.rest.put(
        Routes.applicationCommands(this.clientId),
        { body },
      );

      log.success(`${(data as unknown[]).length} komut başarıyla kaydedildi (global).`);
    } catch (error) {
      log.error('Komut kaydetme hatası.', error);
      throw error;
    }
  }

  async registerGuild(guildId: string): Promise<void> {
    try {
      log.info(`${this.commands.size} komut kaydediliyor (guild: ${guildId})...`);

      const body = this.commands.map((cmd) => cmd.data.toJSON());

      const data = await this.rest.put(
        Routes.applicationGuildCommands(this.clientId, guildId),
        { body },
      );

      log.success(`${(data as unknown[]).length} komut başarıyla kaydedildi (guild: ${guildId}).`);
    } catch (error) {
      log.error('Guild komut kaydetme hatası.', error);
      throw error;
    }
  }

  async clearGlobal(): Promise<void> {
    try {
      log.info('Global komutlar temizleniyor...');
      await this.rest.put(Routes.applicationCommands(this.clientId), { body: [] });
      log.success('Global komutlar temizlendi.');
    } catch (error) {
      log.error('Global komut temizleme hatası.', error);
      throw error;
    }
  }

  async clearGuild(guildId: string): Promise<void> {
    try {
      log.info(`${guildId} için komutlar temizleniyor...`);
      await this.rest.put(
        Routes.applicationGuildCommands(this.clientId, guildId),
        { body: [] },
      );
      log.success(`${guildId} için komutlar temizlendi.`);
    } catch (error) {
      log.error('Guild komut temizleme hatası.', error);
      throw error;
    }
  }
}
