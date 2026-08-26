import { z } from 'zod';

export const envSchema = z.object({
  DATABASE_URL: z.string().url().or(z.string().startsWith('postgresql://')),
  TOKEN: z.string().min(1, 'Discord token gerekli'),
  CLIENT_ID: z.string().min(1, 'Client ID gerekli'),
  ERROR_LOG_CHANNEL_ID: z.string().optional().default(''),
  CLIENT_SECRET: z.string().optional().default(''),
  DISCORD_PUBLIC_KEY: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(),
  LINKED_ROLES_REDIRECT_URI: z.string().url().optional(),
  OWNER_ID: z.string().optional().default(''),
  DEVELOPER_IDS: z.string().optional().default(''),
  BOT_NAME: z.string().optional().default('CyberBOT'),
  BOT_VERSION: z.string().optional().default('1.0.0'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  WEB_PORT: z.string().optional().default('3000'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type Env = z.infer<typeof envSchema>;

let validatedEnv: Env | null = null;

export function validateEnv(): Env {
  if (validatedEnv) return validatedEnv;

  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    console.error('Environment değişkenleri geçersiz:');
    console.error(result.error.format());
    process.exit(1);
  }

  validatedEnv = result.data;
  return validatedEnv;
}
