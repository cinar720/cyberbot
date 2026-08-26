import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  ButtonStyle,
  Message,
  ChatInputCommandInteraction,
  MessageFlags,
  TextChannel,
} from 'discord.js';
import type { EmbedOptions } from '../types/index.js';
import { colors } from '../config/colors.js';
import { emojis } from '../config/emojis.js';
import { main } from '../config/main.js';
import { links } from '../config/links.js';

export class CyberEmbed extends EmbedBuilder {
  constructor(options?: EmbedOptions) {
    super();

    this.setFooter({
      text: `${main.botName} v${main.botVersion} | ${links.website} | ${links.support}`,
    });

    if (options?.title) this.setTitle(options.title);
    if (options?.description) this.setDescription(options.description);
    if (options?.color) this.setColor(options.color);
    if (options?.url) this.setURL(options.url);
    if (options?.timestamp) this.setTimestamp(new Date(options.timestamp));
    if (options?.footer) this.setFooter(options.footer);
    if (options?.image) this.setImage(options.image.url);
    if (options?.thumbnail) this.setThumbnail(options.thumbnail.url);
    if (options?.author) this.setAuthor(options.author);
    if (options?.fields) {
      for (const field of options.fields) {
        this.addFields(field);
      }
    }
  }

  static success(title: string, description?: string): CyberEmbed {
    return new CyberEmbed({
      title: `${emojis.success} ${title}`,
      description,
      color: colors.success,
    });
  }

  static error(title: string, description?: string): CyberEmbed {
    return new CyberEmbed({
      title: `${emojis.error} ${title}`,
      description,
      color: colors.error,
    });
  }

  static warning(title: string, description?: string): CyberEmbed {
    return new CyberEmbed({
      title: `${emojis.warning} ${title}`,
      description,
      color: colors.warning,
    });
  }

  static info(title: string, description?: string): CyberEmbed {
    return new CyberEmbed({
      title: `${emojis.info} ${title}`,
      description,
      color: colors.info,
    });
  }

  static neutral(title: string, description?: string): CyberEmbed {
    return new CyberEmbed({
      title,
      description,
      color: colors.primary,
    });
  }

  setDefaultFooter(): this {
    return this.setFooter({
      text: `${main.botName} v${main.botVersion} | ${links.website} | ${links.support}`,
    });
  }

  setTimestampNow(): this {
    return this.setTimestamp(new Date());
  }
}

export class CyberButton extends ActionRowBuilder<ButtonBuilder> {
  static primary(customId: string, label: string, emoji?: string): CyberButton {
    const btn = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Primary);
    if (emoji) btn.setEmoji(emoji);
    return new CyberButton().addComponents(btn);
  }

  static secondary(customId: string, label: string, emoji?: string): CyberButton {
    const btn = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Secondary);
    if (emoji) btn.setEmoji(emoji);
    return new CyberButton().addComponents(btn);
  }

  static success(customId: string, label: string, emoji?: string): CyberButton {
    const btn = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Success);
    if (emoji) btn.setEmoji(emoji);
    return new CyberButton().addComponents(btn);
  }

  static danger(customId: string, label: string, emoji?: string): CyberButton {
    const btn = new ButtonBuilder()
      .setCustomId(customId)
      .setLabel(label)
      .setStyle(ButtonStyle.Danger);
    if (emoji) btn.setEmoji(emoji);
    return new CyberButton().addComponents(btn);
  }

  static link(url: string, label: string, emoji?: string): CyberButton {
    const btn = new ButtonBuilder()
      .setURL(url)
      .setLabel(label)
      .setStyle(ButtonStyle.Link);
    if (emoji) btn.setEmoji(emoji);
    return new CyberButton().addComponents(btn);
  }
}

export async function sendEmbed(
  target: Message | ChatInputCommandInteraction,
  options: EmbedOptions,
): Promise<void> {
  const embed = new CyberEmbed(options).setDefaultFooter().setTimestampNow();

  if ('reply' in target) {
    await target.reply({ embeds: [embed] }).catch(() => {
      const ch = target.channel;
      if (ch && 'send' in ch) {
        (ch as TextChannel).send({ embeds: [embed] }).catch(() => null);
      }
    });
  } else if ('followUp' in target) {
    await (target as ChatInputCommandInteraction).followUp({ embeds: [embed] }).catch(() => {
      const ch = (target as ChatInputCommandInteraction).channel;
      if (ch && 'send' in ch) {
        (ch as TextChannel).send({ embeds: [embed] }).catch(() => null);
      }
    });
  }
}

export async function sendError(
  target: Message | ChatInputCommandInteraction,
  title: string,
  description?: string,
): Promise<void> {
  const embed = CyberEmbed.error(title, description).setDefaultFooter().setTimestampNow();

  if (target instanceof Message) {
    const ch = target.channel;
    if (ch && 'send' in ch) {
      await (ch as TextChannel).send({ embeds: [embed] }).catch(() => null);
    }
  } else {
    await target
      .reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] })
      .catch(() => null);
  }
}

export async function sendSuccess(
  target: Message | ChatInputCommandInteraction,
  title: string,
  description?: string,
): Promise<void> {
  const embed = CyberEmbed.success(title, description).setDefaultFooter().setTimestampNow();

  if (target instanceof Message) {
    const ch = target.channel;
    if (ch && 'send' in ch) {
      await (ch as TextChannel).send({ embeds: [embed] }).catch(() => null);
    }
  } else {
    await target
      .reply({ embeds: [embed] })
      .catch(() => null);
  }
}
