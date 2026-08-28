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
import { TICKET_CATEGORY_LABELS, type TicketCategory } from '../services/ticket.js';

const TICKET_OPTIONS: Array<{
  value: string;
  label: string;
  description: string;
  emoji: string;
}> = [
  {
    value: 'general',
    label: 'Genel Destek',
    description: 'Genel sorularınız ve yardım talepleriniz',
    emoji: Emojis.question,
  },
  {
    value: 'bug',
    label: 'Hata Bildirimi',
    description: 'Karşılaştığınız hataları bildirin',
    emoji: Emojis.hata,
  },
  {
    value: 'premium',
    label: 'Premium Destek',
    description: 'Premium üyelere özel destek hattı',
    emoji: Emojis.star,
  },
  {
    value: 'partnership',
    label: 'Partnerlik',
    description: 'Partnerlik başvurularınız',
    emoji: Emojis.users,
  },
  {
    value: 'advertisement',
    label: 'Reklam Talebi',
    description: 'Reklam ve tanıtım talepleriniz',
    emoji: Emojis.fire,
  },
];

export function buildTicketPanel(): ContainerBuilder {
  const select = new StringSelectMenuBuilder()
    .setCustomId('ticket_category_select')
    .setPlaceholder('Bir destek kategorisi seçin')
    .addOptions(
      TICKET_OPTIONS.map((opt) => ({
        label: opt.label,
        value: opt.value,
        description: opt.description,
        emoji: opt.emoji,
      })),
    );

  return new ContainerBuilder()
    .setAccentColor(0x5865f2)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.shield} CyberBOT Destek`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        [
          'Destek almak için aşağıdaki menüden bir kategori seçin.',
          '',
          `${Emojis.info} Talebiniz yetkililer tarafından incelenecektir.`,
          `${Emojis.basari} Uygun kategoriyi seçtiğinizden emin olun.`,
          `${Emojis.uyari} Aynı kategoride açık talebiniz varsa yeni talep oluşturamazsınız.`,
        ].join('\n'),
      ),
    )
    .addActionRowComponents(new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select));
}

export function buildTicketCreatedContainer(
  ticketNumber: number,
  category: TicketCategory,
  userId: string,
  description?: string,
  claimedById?: string | null,
): ContainerBuilder {
  const label = TICKET_CATEGORY_LABELS[category] ?? category;
  const claimedLine = claimedById
    ? `${Emojis.user} **Sorumlu Yetkili:** <@${claimedById}>`
    : `${Emojis.clock} **Sorumlu Yetkili:** Henüz üstlenilmedi`;

  const lines: string[] = [
    `${Emojis.user} **Kullanıcı:** <@${userId}>`,
    `${Emojis.channel} **Talep Türü:** ${label}`,
    `${Emojis.link} **Ticket ID:** #${ticketNumber}`,
    `${Emojis.calendar} **Oluşturulma Tarihi:** <t:${Math.floor(Date.now() / 1000)}:F>`,
    '',
    claimedLine,
  ];

  if (description && description.trim().length > 0) {
    lines.push('', `${Emojis.edit} **Açıklama:**`, description);
  }

  lines.push('', `${Emojis.info} Destek ekibi en kısa sürede buradan yanıtlayacaktır.`);

  return new ContainerBuilder()
    .setAccentColor(0x57f287)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`## ${Emojis.shield} CyberBOT Destek`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(lines.join('\n')))
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId(`ticket_claim_${ticketNumber}`)
          .setLabel(claimedById ? 'Sorumluluğu Devret' : 'Üzerime Al')
          .setEmoji(Emojis.user)
          .setStyle(ButtonStyle.Primary)
          .setDisabled(!!claimedById),
        new ButtonBuilder()
          .setCustomId(`ticket_transcript_${ticketNumber}`)
          .setLabel('Transcript')
          .setEmoji(Emojis.link)
          .setStyle(ButtonStyle.Secondary),
        new ButtonBuilder()
          .setCustomId(`ticket_close_${ticketNumber}`)
          .setLabel("Ticket'ı Kapat")
          .setEmoji(Emojis.lock)
          .setStyle(ButtonStyle.Danger),
      ),
    );
}

export function buildTicketClaimedContainer(
  ticketNumber: number,
  category: TicketCategory,
  userId: string,
  claimedById: string,
  description?: string,
): ContainerBuilder {
  return buildTicketCreatedContainer(ticketNumber, category, userId, description, claimedById);
}

export function buildTicketCloseConfirmContainer(): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(0xed4245)
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`### ${Emojis.uyari} Ticket Kapatma Onayı`),
    )
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        'Bu destek talebini kapatmak istediğinize emin misiniz?\nBu işlem geri alınamaz.',
      ),
    )
    .addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder()
          .setCustomId('ticket_close_confirm')
          .setLabel('Kapat')
          .setEmoji(Emojis.check)
          .setStyle(ButtonStyle.Danger),
        new ButtonBuilder()
          .setCustomId('ticket_close_cancel')
          .setLabel('Vazgeç')
          .setEmoji(Emojis.cross)
          .setStyle(ButtonStyle.Secondary),
      ),
    );
}
