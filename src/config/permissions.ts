import { PermissionFlagsBits } from 'discord.js';

export const permissions = {
  owner: ['Administrator'] as const,
  developer: ['Administrator'] as const,
  admin: [
    PermissionFlagsBits.Administrator,
  ],
  moderator: [
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.ModerateMembers,
  ],
  manager: [
    PermissionFlagsBits.ManageGuild,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ],
  basic: [
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ViewChannel,
  ],
} as const;

export const staffRoles = {
  owner: 'owner',
  founder: 'founder',
  admin: 'admin',
  moderator: 'moderator',
  helper: 'helper',
  trial: 'trial',
} as const;

export type StaffRole = keyof typeof staffRoles;
