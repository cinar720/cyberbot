export const links = {
  website: process.env.WEBSITE_URL || 'https://cyberbot.net.tr',
  invite: process.env.BOT_INVITE_URL || '',
  support: process.env.SUPPORT_SERVER_URL || 'https://discord.gg/cyberbot',
  github: process.env.GITHUB_URL || '',
  docs: process.env.DOCS_URL || '',
  status: process.env.STATUS_URL || '',
  tos: process.env.TOS_URL || '',
  privacy: process.env.PRIVACY_URL || '',
} as const;

export const apiLinks = {
  discord: 'https://discord.com/api/v10',
  github: 'https://api.github.com',
} as const;
