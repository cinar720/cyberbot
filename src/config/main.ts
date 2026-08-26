export const main = {
  botName: process.env.BOT_NAME || 'CyberBOT',
  botVersion: process.env.BOT_VERSION || '1.0.0',
  get token(): string { return process.env.TOKEN || ''; },
  get clientId(): string { return process.env.CLIENT_ID || ''; },
  get ownerId(): string { return process.env.OWNER_ID || ''; },
  get developerIds(): string[] { return process.env.DEVELOPER_IDS?.split(',').filter(Boolean) || []; },
  get guildId(): string { return process.env.GUILD_ID || ''; },
  prefix: process.env.DEFAULT_PREFIX || '!',
  get nodeEnv(): string { return process.env.NODE_ENV || 'development'; },
  get isDevelopment(): boolean { return process.env.NODE_ENV === 'development'; },
  get isProduction(): boolean { return process.env.NODE_ENV === 'production'; },
};
