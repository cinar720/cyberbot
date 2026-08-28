import { createChildLogger } from './logger.js';
import { sendErrorLog, createEmbed, LogColors } from '../services/logger/discord.js';

const log = createChildLogger('ERROR');

export function setupGlobalErrorHandlers(): void {
  process.on('unhandledRejection', (reason) => {
    const message = reason instanceof Error ? reason.message : String(reason);
    log.error('Unhandled Rejection: %s', message);

    const embed = createEmbed(LogColors.ERROR, 'Unhandled Rejection', message);
    void sendErrorLog(embed).catch(() => null);
  });

  process.on('uncaughtException', (error) => {
    log.fatal('Uncaught Exception: %s', error.message);

    const embed = createEmbed(LogColors.ERROR, 'Uncaught Exception', error.message);
    void sendErrorLog(embed).catch(() => null);

    process.exit(1);
  });
}
