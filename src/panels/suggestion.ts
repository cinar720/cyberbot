import {
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} from 'discord.js';
import { Emojis } from '../config/emojis.js';

export function buildSuggestionInputPanel(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xfee75c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.sparkles} CyberBOT Öneri Sistemi`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          "CyberBOT'u daha iyi hale getirmek için önerilerinizi paylaşabilirsiniz.",
          '',
          `${Emojis.info} Öneriniz yetkililer tarafından incelenecektir.`,
          `${Emojis.basari} Kabul edilen öneriler uygulanacaktır.`,
          `${Emojis.shield} Profesyonel ve saygılı bir dil kullanın.`,
        ].join('\n'),
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('suggestion_submit')
          .setLabel('Öneri Gönder')
          .setEmoji(Emojis.star)
          .setStyle(ButtonStyle.Primary),
      ),
    );
}

export function buildSuggestionApprovalContainer(
  suggestionNumber: number,
  title: string,
  content: string,
  userId: string,
  staffMentions: string,
): ContainerBuilder {
  const select = new StringSelectMenuBuilder()
    .setCustomId(`suggestion_approval_select_${suggestionNumber}`)
    .setPlaceholder('Değerlendirme işlemini seçin')
    .addOptions([
      {
        label: 'Onayla',
        value: 'approve',
        description: 'Öneriyi onayla ve yayınla',
        emoji: Emojis.check,
      },
      {
        label: 'Reddet',
        value: 'reject',
        description: 'Öneriyi reddet',
        emoji: Emojis.cross,
      },
    ]);

  return new ContainerBuilder()
    .setAccentColor(0xfee75c)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${Emojis.sparkles} Yeni Öneri  ${staffMentions ? `\n\n${staffMentions}` : ''}`,
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `${Emojis.star} **Öneri #${suggestionNumber}**`,
          '',
          `**Başlık:**`,
          title,
          '',
          `**Açıklama:**`,
          content,
          '',
          `**Gönderen:** <@${userId}>`,
          '',
          `**Durum:** ${Emojis.clock} Onay Bekliyor`,
        ].join('\n'),
      ),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        `${Emojis.calendar} <t:${Math.floor(Date.now() / 1000)}:F>`,
      ),
    )
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
}

export function buildSuggestionResolvedContainer(
  suggestionNumber: number,
  title: string,
  content: string,
  userId: string,
  status: 'approved' | 'rejected',
  reviewedBy: string,
  reviewedAt: Date,
  rejectionReason?: string,
): ContainerBuilder {
  const isApproved = status === 'approved';
  const statusEmoji = isApproved ? Emojis.basari : Emojis.hata;
  const statusText = isApproved ? 'Onaylandı' : 'Reddedildi';
  const color = isApproved ? 0x57f287 : 0xed4245;

  const lines: string[] = [
    `${Emojis.star} **Öneri #${suggestionNumber}**`,
    '',
    `**Başlık:**`,
    title,
    '',
    `**Açıklama:**`,
    content,
    '',
    `**Gönderen:** <@${userId}>`,
    '',
    `**Durum:** ${statusEmoji} ${statusText}`,
    `**${isApproved ? 'Onaylayan' : 'Reddeden'}:** <@${reviewedBy}>`,
    `**Tarih:** <t:${Math.floor(reviewedAt.getTime() / 1000)}:F>`,
  ];

  if (!isApproved && rejectionReason) {
    lines.push('', `**Sebep:** ${rejectionReason}`);
  }

  return new ContainerBuilder()
    .setAccentColor(color)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`${Emojis.sparkles} Öneri Sonuçlandı`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')));
}

export function buildSuggestionPublishedContainer(
  suggestionNumber: number,
  title: string,
  content: string,
  userId: string,
  reviewedBy: string,
  reviewedAt: Date,
): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0x57f287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.sparkles} Öneri #${suggestionNumber}`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          `**Başlık:**`,
          title,
          '',
          `**Açıklama:**`,
          content,
          '',
          `**Gönderen:** <@${userId}>`,
          '',
          `**Durum:** ${Emojis.basari} Onaylandı`,
          `**Onaylayan:** <@${reviewedBy}>`,
          `**Tarih:** <t:${Math.floor(reviewedAt.getTime() / 1000)}:F>`,
        ].join('\n'),
      ),
    );
}
