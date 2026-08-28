import { z } from 'zod';
import { config } from 'dotenv';

config();

const envSchema = z.object({
  TOKEN: z.string().min(1, 'TOKEN is required'),
  CLIENT_ID: z.string().min(1, 'CLIENT_ID is required'),
  OWNER_ID: z.string().min(1, 'OWNER_ID is required'),
  BOT_NAME: z.string().default('CyberBOT'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  WEB_PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(['development', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),

  SUPPORT_GUILD_ID: z.string().optional(),
  BOT_LOG_CHANNEL_ID: z.string().optional(),
  ERROR_LOG_CHANNEL_ID: z.string().optional(),
  BOT_PING_CHANNEL_ID: z.string().optional(),
  BOT_VOICE_CHANNEL_ID: z.string().optional(),
  GUILD_JOIN_CHANNEL_ID: z.string().optional(),
  TOPGG_CHANNEL_ID: z.string().optional(),
  TOPGG_LOG_CHANNEL_ID: z.string().optional(),
  GUILD_STATS_CHANNEL_ID: z.string().optional(),
  MOD_LOG_CHANNEL_ID: z.string().optional(),
  RULES_CHANNEL_ID: z.string().optional(),
  TICKET_SUPPORT_CHANNEL_ID: z.string().optional(),
  SUGGESTION_INPUT_CHANNEL_ID: z.string().optional(),
  SUGGESTION_OUTPUT_CHANNEL_ID: z.string().optional(),
  SUGGESTION_APPROVAL_CHANNEL_ID: z.string().optional(),
  ADVERTISEMENT_CHANNEL_ID: z.string().optional(),
  TICKET_CATEGORY_ID: z.string().optional(),
  BOT_STARTUP_CHANNEL_ID: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    throw new Error('Environment not initialized. Call validateEnv() first.');
  }
  return _env;
}

export function validateEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const errors = result.error.flatten().fieldErrors;
    const messages = Object.entries(errors)
      .map(([key, vals]) => `  ${key}: ${vals?.join(', ')}`)
      .join('\n');

    throw new Error(`Invalid environment variables:\n${messages}`);
  }

  _env = result.data;
  return _env;
}
