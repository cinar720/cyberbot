import { z } from 'zod';

export const guildConfigSchema = z.object({
  prefix: z
    .string()
    .min(1, 'Prefix en az 1 karakter olmali')
    .max(5, 'Prefix en fazla 5 karakter olabilir'),
  language: z.enum(['tr', 'en']),
  enabled: z.boolean(),
  modEnabled: z.boolean(),
  logChannelId: z.string().nullable(),
  muteRoleId: z.string().nullable(),
  jailRoleId: z.string().nullable(),
});

export type GuildConfigInput = z.infer<typeof guildConfigSchema>;

export const defaultGuildConfig: GuildConfigInput = {
  prefix: '!',
  language: 'tr',
  enabled: true,
  modEnabled: false,
  logChannelId: null,
  muteRoleId: null,
  jailRoleId: null,
};
