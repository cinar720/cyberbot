import pino from 'pino';
import chalk from 'chalk';

const isDev = process.env.NODE_ENV !== 'production';

const pinoLogger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: isDev
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:HH:MM:ss',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});

const categoryColors: Record<string, (text: string) => string> = {
  DATABASE: chalk.magenta,
  COMMAND: chalk.blue,
  EVENT: chalk.cyan,
  BUTTON: chalk.yellow,
  SELECT: chalk.green,
  MODAL: chalk.magentaBright,
  HANDLER: chalk.blueBright,
  READY: chalk.greenBright,
  WARNING: chalk.yellowBright,
  ERROR: chalk.redBright,
  BOT: chalk.white,
  API: chalk.cyanBright,
  PERMISSION: chalk.red,
  CACHE: chalk.gray,
  WEB: chalk.blue,
};

export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  private formatMessage(message: string): string {
    const colorFn = categoryColors[this.context] || chalk.white;
    const tag = colorFn(`[${this.context}]`);
    const time = chalk.gray(new Date().toLocaleTimeString('tr-TR'));
    return `${time} ${tag} ${message}`;
  }

  info(message: string, data?: unknown): void {
    console.log(this.formatMessage(chalk.green(message)));
    if (data) pinoLogger.info(data);
  }

  warn(message: string, data?: unknown): void {
    console.warn(this.formatMessage(chalk.yellow(message)));
    if (data) pinoLogger.warn(data);
  }

  error(message: string, error?: unknown): void {
    console.error(this.formatMessage(chalk.red(message)));
    if (error instanceof Error) {
      pinoLogger.error({ err: error }, error.message);
    } else if (error) {
      pinoLogger.error(error);
    }
  }

  debug(message: string, data?: unknown): void {
    if (isDev) {
      console.debug(this.formatMessage(chalk.gray(message)));
    }
    if (data) pinoLogger.debug(data);
  }

  success(message: string): void {
    console.log(this.formatMessage(chalk.greenBright(message)));
  }

  fatal(message: string, error?: unknown): void {
    console.error(this.formatMessage(chalk.bgRed.white(message)));
    if (error instanceof Error) {
      pinoLogger.fatal({ err: error }, error.message);
    } else if (error) {
      pinoLogger.fatal(error);
    }
    process.exit(1);
  }
}
