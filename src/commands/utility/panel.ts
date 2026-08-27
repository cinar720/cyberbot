import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextDisplayBuilder,
  type StringSelectMenuInteraction,
} from 'discord.js';
import { emojis } from '../../config/emojis.js';
import { colors } from '../../config/colors.js';
import { getInviteUrl } from '../../web/auth/oauth2.js';
import { links } from '../../config/links.js';
import type { SlashCommand, CyberBotClient } from '../../types/command.js';

export default {
  metadata: {
    name: 'panel',
    description: 'CyberBOT ana kontrol panelini gösterir.',
    category: 'utility',
    cooldown: 10,
    enabled: true,
    developerOnly: false,
    ownerOnly: false,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('CyberBOT ana kontrol panelini gösterir.'),

  async execute({ interaction }) {
    const botInviteUrl = getInviteUrl();
    const webPanelUrl = process.env.WEB_URL || links.website;
    const supportUrl = links.support;

    const container = new ContainerBuilder().setAccentColor(colors.info);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent('# CyberBOT\n\n**Yönetim Paneli**'),
    );
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Discord sunucunuzu güvenli ve profesyonel şekilde yönetin.\n\n' +
        `${emojis.shield} **Geliştirilmiş Guard** - Anti-raid, anti-spam, anti-nuke\n` +
        `${emojis.settings} **AutoMod** - Otomatik moderasyon kuralları\n` +
        `${emojis.link} **Ticket** - Destek talebi sistemi\n` +
        `${emojis.search} **Loglar** - Tüm log kayıtları\n` +
        `${emojis.crown} **Premium** - Gelişmiş özellikler\n` +
        `${emojis.key} **Kolay yönetim** - Web panel ile kontrol`,
      ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setURL(botInviteUrl).setLabel('Botu ekle').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setURL(webPanelUrl).setLabel('Web paneli').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setURL(supportUrl).setLabel('Destek sunucusu').setStyle(ButtonStyle.Link),
      ),
    );

    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('cyberbot:panel:select')
          .setPlaceholder('Bir özellik seçin')
          .addOptions(
          new StringSelectMenuOptionBuilder()
            .setLabel('Moderasyon')
            .setValue('cyberbot:panel:feature:moderation')
            .setDescription('Ban, kick, mute, warn ve daha fazlası'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Guard')
            .setValue('cyberbot:panel:feature:guard')
            .setDescription('Anti-raid, anti-spam, anti-nuke'),
          new StringSelectMenuOptionBuilder()
            .setLabel('AutoMod')
            .setValue('cyberbot:panel:feature:automod')
            .setDescription('Otomatik moderasyon kuralları'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Ticket')
            .setValue('cyberbot:panel:feature:ticket')
            .setDescription('Destek talebi sistemi'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Loglar')
            .setValue('cyberbot:panel:feature:logs')
            .setDescription('Mesaj, ses, kanal ve moderasyon kayıtları'),
          new StringSelectMenuOptionBuilder()
            .setLabel('Premium')
            .setValue('cyberbot:panel:feature:premium')
            .setDescription('Gelişmiş özellikler ve öncelikli destek'),
          ),
      ),
    );

    await interaction.reply({
      components: [container],
      flags: [MessageFlags.IsComponentsV2],
    });
  },
} satisfies SlashCommand;

const featureInfo: Record<string, { title: string; description: string }> = {
  moderation: {
    title: 'Moderasyon',
    description:
      'Ban, kick, mute, warn, timeout, jail ve daha fazlası.\n\n' +
      'Komutlar: `/ban`, `/kick`, `/mute`, `/warn`, `/timeout`, `/jail`, `/lock`, `/unlock`, `/slowmode`\n\n' +
      'Detaylı bilgi için: `/help kategori:moderation`',
  },
  guard: {
    title: 'Guard',
    description:
      'Anti-raid, anti-spam, anti-nuke koruma sistemleri.\n\n' +
      'Komutlar: `/guard`, `/guard-config`\n\n' +
      'Detaylı bilgi için: `/help kategori:moderation`',
  },
  automod: {
    title: 'AutoMod',
    description:
      'Otomatik moderasyon kuralları ile spam, link, kelime filtresi.\n\n' +
      'Komutlar: `/automod`, `/automod-config`\n\n' +
      'Detaylı bilgi için: `/help kategori:moderation`',
  },
  ticket: {
    title: 'Ticket',
    description:
      'Destek talebi sistemi ile üyelerinize yardımcı olun.\n\n' +
      'Komutlar: `/ticket`, `/ticket-add`, `/ticket-claim`, `/ticket-close`\n\n' +
      'Detaylı bilgi için: `/help kategori:utility`',
  },
  logs: {
    title: 'Loglar',
    description:
      'Mesaj, ses, kanal ve moderasyon log kayıtları.\n\n' +
      'Komutlar: `/log`, `/log-clear`\n\n' +
      'Detaylı bilgi için: `/help kategori:moderation`',
  },
  premium: {
    title: 'Premium',
    description:
      'Gelişmiş özellikler ve öncelikli destek.\n\n' +
      'Durumunuzu kontrol etmek için: `/premium`',
  },
};

export async function handlePanelComponent(
  interaction: StringSelectMenuInteraction,
  _client: CyberBotClient,
): Promise<void> {
  const value = interaction.values[0];
  const feature = value?.split(':').pop();

  if (!feature || !featureInfo[feature]) {
    await interaction.reply({
      components: [
        new ContainerBuilder()
          .setAccentColor(colors.error)
          .addTextDisplayComponents(
            new TextDisplayBuilder().setContent('# Hata\n\nGeçersiz özellik seçildi.'),
          ),
      ],
      flags: [MessageFlags.Ephemeral, MessageFlags.IsComponentsV2],
    });
    return;
  }

  const info = featureInfo[feature];

  const container = new ContainerBuilder().setAccentColor(colors.info);

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(`# ${info.title}`),
  );

  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(info.description),
  );

  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId('cyberbot:panel:back')
        .setLabel('Geri')
        .setStyle(ButtonStyle.Secondary),
    ),
  );

  await interaction.update({ components: [container] });
}

export async function handlePanelButton(
  interaction: import('discord.js').ButtonInteraction,
  _client: CyberBotClient,
): Promise<void> {
  const botInviteUrl = getInviteUrl();
  const webPanelUrl = process.env.WEB_URL || links.website;
  const supportUrl = links.support;

  const container = new ContainerBuilder().setAccentColor(colors.info);
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent('# CyberBOT\n\n**Yönetim Paneli**'),
  );
  container.addTextDisplayComponents(
    new TextDisplayBuilder().setContent(
      'Discord sunucunuzu güvenli ve profesyonel şekilde yönetin.\n\n' +
      `${emojis.shield} **Geliştirilmiş Guard** - Anti-raid, anti-spam, anti-nuke\n` +
      `${emojis.settings} **AutoMod** - Otomatik moderasyon kuralları\n` +
      `${emojis.link} **Ticket** - Destek talebi sistemi\n` +
      `${emojis.search} **Loglar** - Tüm log kayıtları\n` +
      `${emojis.crown} **Premium** - Gelişmiş özellikler\n` +
      `${emojis.key} **Kolay yönetim** - Web panel ile kontrol`,
    ),
  );
  container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));

  container.addActionRowComponents(
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder().setURL(botInviteUrl).setLabel('Botu ekle').setStyle(ButtonStyle.Link),
      new ButtonBuilder().setURL(webPanelUrl).setLabel('Web paneli').setStyle(ButtonStyle.Link),
      new ButtonBuilder().setURL(supportUrl).setLabel('Destek sunucusu').setStyle(ButtonStyle.Link),
    ),
  );

  container.addActionRowComponents(
    new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId('cyberbot:panel:select')
        .setPlaceholder('Bir özellik seçin')
        .addOptions(
          new StringSelectMenuOptionBuilder().setLabel('Moderasyon').setValue('cyberbot:panel:feature:moderation').setDescription('Ban, kick, mute, warn ve daha fazlası'),
          new StringSelectMenuOptionBuilder().setLabel('Guard').setValue('cyberbot:panel:feature:guard').setDescription('Anti-raid, anti-spam, anti-nuke'),
          new StringSelectMenuOptionBuilder().setLabel('AutoMod').setValue('cyberbot:panel:feature:automod').setDescription('Otomatik moderasyon kuralları'),
          new StringSelectMenuOptionBuilder().setLabel('Ticket').setValue('cyberbot:panel:feature:ticket').setDescription('Destek talebi sistemi'),
          new StringSelectMenuOptionBuilder().setLabel('Loglar').setValue('cyberbot:panel:feature:logs').setDescription('Mesaj, ses, kanal ve moderasyon kayıtları'),
          new StringSelectMenuOptionBuilder().setLabel('Premium').setValue('cyberbot:panel:feature:premium').setDescription('Gelişmiş özellikler ve öncelikli destek'),
        ),
    ),
  );

  await interaction.update({ components: [container] });
}
