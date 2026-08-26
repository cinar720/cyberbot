export const channels = {
  logs: {
    moderation: process.env.MOD_LOG_CHANNEL_ID || '',
    message: process.env.MESSAGE_LOG_CHANNEL_ID || '',
    join: process.env.JOIN_LOG_CHANNEL_ID || '',
    voice: process.env.VOICE_LOG_CHANNEL_ID || '',
    channel: process.env.CHANNEL_LOG_CHANNEL_ID || '',
    role: process.env.ROLE_LOG_CHANNEL_ID || '',
  },
  system: {
    welcome: process.env.WELCOME_CHANNEL_ID || '',
    leave: process.env.LEAVE_CHANNEL_ID || '',
    boost: process.env.BOOST_CHANNEL_ID || '',
    rules: process.env.RULES_CHANNEL_ID || '',
    announcements: process.env.ANNOUNCEMENTS_CHANNEL_ID || '',
  },
  tickets: {
    category: process.env.TICKET_CATEGORY_ID || '',
    log: process.env.TICKET_LOG_CHANNEL_ID || '',
  },
  suggestions: {
    channel: process.env.SUGGESTIONS_CHANNEL_ID || '',
  },
} as const;
