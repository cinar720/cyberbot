import {
  SlashCommandBuilder,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  type TextChannel,
} from 'discord.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';
import { getEnv } from '../../config/env.js';
import { buildTicketPanel } from '../../panels/ticket.js';
import { createChildLogger } from '../../utils/logger.js';
import { Emojis } from '../../config/emojis.js';

const log = createChildLogger('TICKET-PANEL');

const CV2 = 32768;

function buildErrorContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xed4245)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${Emojis.hata} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

function buildSuccessContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x57f287)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${Emojis.basari} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

async function sendOrUpdatePanel(
  channel: TextChannel,
  clientId: string,
): Promise<'sent' | 'updated'> {
  const messages = await channel.messages.fetch({ limit: 20 });
  const existing = messages.find((m) => m.author.id === clientId);

  const container = buildTicketPanel();

  if (existing) {
    await existing.edit({ components: [container] });
    return 'updated';
  }
  await channel.send({ components: [container], flags: CV2 });
  return 'sent';
}

const command: SlashCommand = {
  metadata: {
    name: 'ticket-panel',
    description: 'Destek panelini yapılandırılmış kanala gönderir veya günceller.',
    category: 'support',
    permissions: [PermissionFlagsBits.Administrator, PermissionFlagsBits.ManageGuild],
    guildOnly: true,
    enabled: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket-panel')
    .setDescription('Destek panelini yapılandırılmış kanala gönderir veya günceller.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false),

  async execute(ctx: CommandContext): Promise<void> {
    await ctx.interaction.deferReply({ ephemeral: true });

    const { interaction, guild } = ctx;

    if (!guild) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Bu komut yalnızca sunucularda kullanılabilir.')],
        flags: CV2,
      });
      return;
    }

    const env = getEnv();
    const channelId = env.TICKET_SUPPORT_CHANNEL_ID;
    if (!channelId) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Destek panel kanalı yapılandırılmamış.')],
        flags: CV2,
      });
      return;
    }

    let channel;
    try {
      channel = await guild.channels.fetch(channelId);
    } catch {
      channel = null;
    }

    if (!channel || !channel.isTextBased()) {
      await interaction.editReply({
        components: [buildErrorContainer('Hata', 'Destek panel kanalı bulunamadı.')],
        flags: CV2,
      });
      return;
    }

    const clientId = ctx.client.user!.id;
    const result = await sendOrUpdatePanel(channel as TextChannel, clientId);

    await interaction.editReply({
      components: [
        buildSuccessContainer(
          'Panel Hazır',
          result === 'sent'
            ? `Destek paneli <#${channelId}> kanalına gönderildi.`
            : `Destek paneli <#${channelId}> kanalında güncellendi.`,
        ),
      ],
      flags: CV2,
    });

    log.info('Ticket panel %s in guild %s', result, guild.id);
  },
};

export default command;
