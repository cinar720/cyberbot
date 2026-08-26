export const security = {
  rateLimit: {
    commands: 3,
    messages: 5,
    joins: 3,
    window: 10000,
  },
  maxMessageLength: 2000,
  maxEmbedLength: 4096,
  maxFieldLength: 1024,
  maxFields: 25,
  maxRoles: 250,
  maxEmoji: 50,
  maxMembers: 500000,
  allowedMentionTypes: ['users', 'roles'] as const,
  restrictedCommands: ['eval', 'exec', 'shutdown', 'restart'],
  sqlInjectionPatterns: [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|FETCH|DECLARE|TRUNCATE|COMMENT)\b)/i,
    /(--|;|'|"|\b(OR|AND)\b\s+\d+\s*=\s*\d+)/i,
    /(\/\*|\*\/|xplore|xplo)/i,
  ],
  spamThresholds: {
    messages: 5,
    time: 5000,
    punishment: 'mute',
    duration: 300000,
  },
} as const;
