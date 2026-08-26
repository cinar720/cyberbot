import { randomBytes } from 'node:crypto';

export interface SessionData {
  userId: string;
  username: string;
  discriminator: string;
  avatar: string;
  guilds: DiscordGuild[];
  accessToken: string;
  createdAt: number;
}

export interface DiscordGuild {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
}

const sessions = new Map<string, SessionData>();

const SESSION_TTL = 7 * 24 * 60 * 60 * 1000;

export function createSession(data: Omit<SessionData, 'createdAt'>): string {
  const token = randomBytes(32).toString('hex');
  sessions.set(token, { ...data, createdAt: Date.now() });
  return token;
}

export function getSession(token: string): SessionData | null {
  const session = sessions.get(token);
  if (!session) return null;
  if (Date.now() - session.createdAt > SESSION_TTL) {
    sessions.delete(token);
    return null;
  }
  return session;
}

export function destroySession(token: string): void {
  sessions.delete(token);
}

export function hasGuildAccess(session: SessionData, guildId: string): boolean {
  return session.guilds.some((g) => g.id === guildId);
}

export function getGuildPermission(session: SessionData, guildId: string): string | null {
  const guild = session.guilds.find((g) => g.id === guildId);
  return guild ? guild.permissions : null;
}

function hasPermission(permissions: string, flag: bigint): boolean {
  try {
    const perms = BigInt(permissions);
    return (perms & flag) === flag;
  } catch {
    return false;
  }
}

const ADMINISTRATOR = 0x8n;
const MANAGE_GUILD = 0x20n;

export function canManageGuild(session: SessionData, guildId: string): boolean {
  const perms = getGuildPermission(session, guildId);
  if (perms === null) return false;
  return hasPermission(perms, ADMINISTRATOR) || hasPermission(perms, MANAGE_GUILD);
}
