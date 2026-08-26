import type { Client } from 'discord.js';

let discordClient: Client | null = null;

export function setDiscordClient(client: Client): void {
  discordClient = client;
}

export function getDiscordClient(): Client | null {
  return discordClient;
}
