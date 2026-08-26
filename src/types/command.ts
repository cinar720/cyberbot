import {
  Client,
  ChatInputCommandInteraction,
  Collection,
  GuildMember,
  PermissionResolvable,
  SlashCommandBuilder,
  SlashCommandOptionsOnlyBuilder,
  AutocompleteInteraction,
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
  ContextMenuCommandInteraction,
} from 'discord.js';

export type CommandCategory =
  | 'moderation'
  | 'management'
  | 'guard'
  | 'setup'
  | 'utility'
  | 'information'
  | 'developer'
  | 'fun'
  | 'message'
  | 'member';

export interface CommandMetadata {
  name: string;
  description: string;
  category: CommandCategory;
  cooldown?: number;
  permissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  developerOnly?: boolean;
  ownerOnly?: boolean;
  guildOnly?: boolean;
  dmPermission?: boolean;
  nsfw?: boolean;
  enabled?: boolean;
  premium?: boolean;
  aliases?: string[];
  usage?: string;
  examples?: string[];
}

export interface CommandContext {
  interaction: ChatInputCommandInteraction;
  member: GuildMember | null;
  guild: ChatInputCommandInteraction['guild'];
  channel: ChatInputCommandInteraction['channel'];
  client: CyberBotClient;
  user: ChatInputCommandInteraction['user'];
}

export interface CyberBotClient extends Client {
  commands: Collection<string, SlashCommand>;
  cooldowns: Collection<string, Collection<string, number>>;
  slashCommands: Collection<string, SlashCommand>;
  buttons: Collection<string, ButtonComponent>;
  modals: Collection<string, ModalComponent>;
  selectMenus: Collection<string, SelectMenuComponent>;
  autocompleteHandlers: Collection<string, AutocompleteHandler>;
  contextMenus: Collection<string, ContextMenuCommand>;
}

export interface SlashCommand {
  metadata: CommandMetadata;
  data: SlashCommandBuilder | SlashCommandOptionsOnlyBuilder;
  execute: (context: CommandContext) => Promise<void>;
  autocomplete?: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface ButtonComponent {
  id: string;
  execute: (interaction: ButtonInteraction) => Promise<void>;
}

export interface ModalComponent {
  id: string;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

export interface SelectMenuComponent {
  id: string;
  execute: (interaction: AnySelectMenuInteraction) => Promise<void>;
}

export interface AutocompleteHandler {
  name: string;
  execute: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface ContextMenuCommand {
  name: string;
  type: 'USER' | 'MESSAGE';
  execute: (interaction: ContextMenuCommandInteraction) => Promise<void>;
}

export interface EmbedOptions {
  title?: string;
  description?: string;
  color?: number;
  url?: string;
  timestamp?: Date | string | number;
  footer?: {
    text: string;
    iconURL?: string;
  };
  image?: {
    url: string;
  };
  thumbnail?: {
    url: string;
  };
  author?: {
    name: string;
    iconURL?: string;
    url?: string;
  };
  fields?: EmbedField[];
}

export interface EmbedField {
  name: string;
  value: string;
  inline?: boolean;
}
