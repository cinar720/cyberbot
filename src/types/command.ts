import type {
  ChatInputCommandInteraction,
  Client,
  Guild,
  GuildMember,
  SlashCommandBuilder,
} from 'discord.js';
import type { RESTPostAPIChatInputApplicationCommandsJSONBody } from 'discord.js';

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  client: Client;
  guild: Guild | null;
  member: GuildMember | null;
}

export interface SlashCommand {
  metadata: {
    name: string;
    description: string;
    category: string;
    cooldown?: number;
    permissions?: bigint[];
    botPermissions?: bigint[];
    guildOnly?: boolean;
    enabled?: boolean;
  };
  data: SlashCommandBuilder | { toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody };
  execute: (ctx: CommandContext) => Promise<void>;
}
