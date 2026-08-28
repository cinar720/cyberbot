import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('PREMIUM');

export interface PremiumStatus {
  isPremium: boolean;
  expiresAt?: Date;
}

export async function checkPremium(_guildId: string, _userId: string): Promise<PremiumStatus> {
  log.debug('Premium check for guild %s user %s — defaulting to false', _guildId, _userId);
  return { isPremium: false };
}

export async function grantPremium(
  _guildId: string,
  _userId: string,
  _expiresAt: Date,
): Promise<void> {
  log.info('Premium granted to user %s in guild %s', _userId, _guildId);
}

export async function revokePremium(_guildId: string, _userId: string): Promise<void> {
  log.info('Premium revoked from user %s in guild %s', _userId, _guildId);
}
