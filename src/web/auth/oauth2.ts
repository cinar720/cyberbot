import type { DiscordGuild } from './session.js';
import { Logger } from '../../utils/logger.js';
import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { PremiumService } from '../../services/premium/PremiumService.js';

const log = new Logger('OAUTH2');
const DISCORD_API = 'https://discord.com/api/v10';

function getClientId(): string {
  return process.env.CLIENT_ID || '';
}

function getClientSecret(): string {
  return process.env.CLIENT_SECRET || '';
}

function getRedirectUri(): string {
  if (process.env.REDIRECT_URI) return process.env.REDIRECT_URI;
  const host = process.env.RENDER_EXTERNAL_URL || process.env.WEB_URL || '';
  if (host) return `${host}/callback`;
  return 'http://localhost:3000/callback';
}

function getLinkedRolesRedirectUri(): string {
  return process.env.LINKED_ROLES_REDIRECT_URI || 'http://localhost:3000/api/discord/linked-roles/callback';
}

function createOAuthState(): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', getClientSecret()).update(timestamp).digest('hex');
  return `${timestamp}.${signature}.${randomBytes(8).toString('hex')}`;
}

export function getOAuth2Url(): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getRedirectUri(),
    response_type: 'code',
    scope: 'identify guilds',
    state: createOAuthState(),
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function verifyOAuthState(state: string): boolean {
  const [timestamp, signature] = state.split('.');
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const timestampValue = Number(timestamp);
  if (!Number.isSafeInteger(timestampValue) || Math.abs(Date.now() - timestampValue) > 10 * 60 * 1000) return false;
  const expected = createHmac('sha256', getClientSecret()).update(timestamp).digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export function getLinkedRolesOAuthUrl(): string {
  const timestamp = Date.now().toString();
  const signature = createHmac('sha256', getClientSecret()).update(timestamp).digest('hex');
  const state = `${timestamp}.${signature}.${randomBytes(8).toString('hex')}`;
  const params = new URLSearchParams({
    client_id: getClientId(),
    redirect_uri: getLinkedRolesRedirectUri(),
    response_type: 'code',
    scope: 'identify role_connections.write',
    state,
  });
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}

export function verifyLinkedRolesState(state: string): boolean {
  const [timestamp, signature] = state.split('.');
  if (!timestamp || !signature || !/^\d+$/.test(timestamp)) return false;
  const timestampValue = Number(timestamp);
  if (!Number.isSafeInteger(timestampValue) || Math.abs(Date.now() - timestampValue) > 10 * 60 * 1000) return false;
  const expected = createHmac('sha256', getClientSecret()).update(timestamp).digest('hex');
  const actualBuffer = Buffer.from(signature, 'hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function exchangeCode(code: string, redirectUri = getRedirectUri()): Promise<string> {
  log.info('Token exchange başlıyor...');
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: redirectUri,
  });

  const res = await fetch(`${DISCORD_API}/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${Buffer.from(`${getClientId()}:${getClientSecret()}`).toString('base64')}`,
    },
    body: body.toString(),
  });

  log.info('Token exchange yanıt: ' + res.status);

  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    log.error('Token exchange hatası: ' + res.status + ' ' + errBody);
    throw new Error(`Discord token exchange failed: ${res.status}`);
  }

  const data = await res.json() as { access_token: string };
  log.success('Token alındı');
  return data.access_token;
}

export async function updateRoleConnection(code: string): Promise<void> {
  const accessToken = await exchangeCode(code, getLinkedRolesRedirectUri());
  const user = await getDiscordUser(accessToken);
  const hasPremium = await PremiumService.hasPremium(user.id);
  const response = await fetch(`${DISCORD_API}/users/@me/applications/${getClientId()}/role-connection`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      platform_name: 'CyberBOT',
      platform_username: user.username,
      metadata: { premium: hasPremium ? '1' : '0' },
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord role connection update failed: ${response.status}`);
  }
}

export async function getDiscordUser(accessToken: string): Promise<{
  id: string;
  username: string;
  discriminator: string;
  avatar: string | null;
}> {
  const res = await fetch(`${DISCORD_API}/users/@me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Discord user fetch failed: ${res.status}`);
  }

  return res.json() as Promise<{
    id: string;
    username: string;
    discriminator: string;
    avatar: string | null;
  }>;
}

export async function getDiscordGuilds(accessToken: string): Promise<DiscordGuild[]> {
  log.info('Discord guilds isteği gönderiliyor...');
  const res = await fetch(`${DISCORD_API}/users/@me/guilds`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  log.info('Discord guilds yanıt: ' + res.status);

  if (!res.ok) {
    const body = await res.text().catch(() => '');
    log.error('Discord guilds hatası: ' + res.status + ' ' + body);
    throw new Error(`Discord guilds fetch failed: ${res.status}`);
  }

  const data = await res.json() as DiscordGuild[];
  log.info('Discord guilds sayısı: ' + data.length);
  return data;
}

export function getInviteUrl(guildId?: string): string {
  const params = new URLSearchParams({
    client_id: getClientId(),
    permissions: '8',
    scope: 'bot applications.commands',
  });
  if (guildId) {
    params.set('guild_id', guildId);
    params.set('disable_guild_select', 'true');
  }
  return `https://discord.com/oauth2/authorize?${params.toString()}`;
}
