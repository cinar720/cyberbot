import { type Guild } from 'discord.js';
import { createChildLogger } from '../utils/logger.js';

const log = createChildLogger('STAFF');

const PREFERRED_NAMES = [
  'Owner',
  'Co Owner',
  'Manager',
  'Head Moderator',
  'Senior Moderator',
  'Moderator',
  'Trial Moderator',
];

const EXCLUDED_NAMES = ['@everyone', 'Bot', 'Member', 'Partner', 'Voter', 'Booster'];

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

function scoreRole(name: string): number {
  const normalized = normalize(name);

  if (EXCLUDED_NAMES.some((ex) => normalize(ex) === normalized)) {
    return Infinity;
  }

  let best = Number.MAX_SAFE_INTEGER;
  for (const preferred of PREFERRED_NAMES) {
    const pn = normalize(preferred);
    if (normalized === pn) {
      best = 0;
      break;
    }
    if (normalized.includes(pn) || pn.includes(normalized)) {
      const distance = Math.abs(normalized.length - pn.length);
      best = Math.min(best, distance);
    }
  }
  return best;
}

/**
 * Discovers moderation / staff roles from the given guild.
 * Returns up to the given limit of role IDs.
 */
export async function discoverStaffRoles(guild: Guild, limit = 3): Promise<string[] | null> {
  try {
    let roles = guild.roles.cache;
    if (roles.size === 0) {
      roles = await guild.roles.fetch();
    }

    const candidates = roles
      .filter((role) => role.name !== '@everyone')
      .map((role) => ({
        id: role.id,
        name: role.name,
        position: role.position,
        score: scoreRole(role.name),
      }))
      .filter((r) => Number.isFinite(r.score))
      .sort((a, b) => a.score - b.score || b.position - a.position);

    const selected = candidates.slice(0, limit).map((r) => r.id);

    if (selected.length === 0) {
      log.warn('No staff roles discovered in guild %s', guild.id);
      return null;
    }

    log.info(
      'Staff roles discovered in guild %s: %s',
      guild.id,
      candidates
        .slice(0, limit)
        .map((r) => `${r.name}(${r.id})`)
        .join(', '),
    );
    return selected;
  } catch (error) {
    log.error(
      'Failed to discover staff roles in guild %s: %s',
      guild.id,
      error instanceof Error ? error.message : String(error),
    );
    return null;
  }
}
