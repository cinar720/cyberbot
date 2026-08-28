import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} from 'discord.js';
import { Emojis } from '../config/emojis.js';

export function buildAdvertisementPanel(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xeb459e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.fire} Reklam Talebi`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          'Sunucunuzu veya projenizi tanıtmak için reklam talebi oluşturun.',
          '',
          `${Emojis.info} Talebiniz yetkililer tarafından incelenecektir.`,
          `${Emojis.basari} Profesyonel ve açıklayıcı bilgi verin.`,
          `${Emojis.shield} Davet bağlantısının çalıştığından emin olun.`,
        ].join('\n'),
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('advertisement_submit')
          .setLabel('Reklam Talebi Oluştur')
          .setEmoji(Emojis.fire)
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

export function buildAdvertisementPublishedContainer(
  ticketNumber: number,
  serverName: string,
  inviteLink: string,
  description: string,
  userId: string,
): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xeb459e)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.fire} Reklam Talebi #${ticketNumber}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `${Emojis.server} **Sunucu/Proje:** ${serverName}`,
          `${Emojis.link} **Davet Bağlantısı:** ${inviteLink}`,
          `${Emojis.edit} **Açıklama:** ${description}`,
          `${Emojis.user} **Talep Sahibi:** <@${userId}>`,
          '',
          `**Durum:** ${Emojis.clock} İnceleniyor`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${Emojis.calendar} <t:${Math.floor(Date.now() / 1000)}:F>`,
      ),
    );
}
