import pino from 'pino';
import { getEnv } from '../config/env.js';

let _logger: pino.Logger | null = null;

export function getLogger(): pino.Logger {
  if (!_logger) {
    const env = getEnv();
    _logger = pino({
      level: env.LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:HH:MM:ss' } }
          : undefined,
    });
  }
  return _logger;
}

export function createChildLogger(name: string): pino.Logger {
  let _child: pino.Logger | null = null;

  return new Proxy({} as pino.Logger, {
    get(_target, prop, _receiver) {
      if (!_child) {
        _child = getLogger().child({ name });
      }
      const value = Reflect.get(_child, prop, _child);
      if (typeof value === 'function') {
        return value.bind(_child);
      }
      return value;
    },
  });
}
