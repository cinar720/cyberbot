import {
  ChatInputCommandInteraction,
  Collection,
  Message,
  PermissionResolvable,
  SlashCommandBuilder,
  ButtonInteraction,
  ModalSubmitInteraction,
  AnySelectMenuInteraction,
  AutocompleteInteraction,
  ContextMenuCommandInteraction,
} from 'discord.js';

export interface CyberClient {
  commands: Collection<string, Command>;
  cooldowns: Collection<string, Collection<string, number>>;
  slashCommands: Collection<string, SlashCommand>;
  buttons: Collection<string, Button>;
  modals: Collection<string, Modal>;
  selectMenus: Collection<string, SelectMenu>;
  autocompleteHandlers: Collection<string, Autocomplete>;
  contextMenus: Collection<string, ContextMenu>;
}

export interface Command {
  name: string;
  description: string;
  category: string;
  usage?: string;
  examples?: string[];
  cooldown?: number;
  ownerOnly?: boolean;
  developerOnly?: boolean;
  guildOnly?: boolean;
  nsfw?: boolean;
  permissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  execute: (message: Message, args: string[]) => Promise<void>;
}

export interface SlashCommand {
  name: string;
  description: string;
  category: string;
  cooldown?: number;
  ownerOnly?: boolean;
  developerOnly?: boolean;
  guildOnly?: boolean;
  nsfw?: boolean;
  permissions?: PermissionResolvable[];
  botPermissions?: PermissionResolvable[];
  data: SlashCommandBuilder;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

export interface Button {
  id: string;
  execute: (interaction: ButtonInteraction) => Promise<void>;
}

export interface Modal {
  id: string;
  execute: (interaction: ModalSubmitInteraction) => Promise<void>;
}

export interface SelectMenu {
  id: string;
  execute: (interaction: AnySelectMenuInteraction) => Promise<void>;
}

export interface Autocomplete {
  name: string;
  execute: (interaction: AutocompleteInteraction) => Promise<void>;
}

export interface ContextMenu {
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
