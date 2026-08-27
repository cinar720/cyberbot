export const premiumConfig = {
  commands: [
    'ticket-close',
    'ticket-transcript',
    'customcommand',
    'customcommand-delete',
    'customcommand-list',
    'auto-response',
    'auto-response-delete',
    'auto-response-list',
    'automod-config',
    'guard-config',
    'welcome-config',
    'leave-config',
    'setup',
    'setup-apply',
  ],
} as const;

export type PremiumCommand = typeof premiumConfig.commands[number];

export function isPremiumCommand(commandName: string): boolean {
  return premiumConfig.commands.includes(commandName as PremiumCommand);
}
