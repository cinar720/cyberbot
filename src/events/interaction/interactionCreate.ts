import {
  Events,
  type Interaction,
  type GuildMember,
  type ButtonInteraction,
  type StringSelectMenuInteraction,
  type ModalSubmitInteraction,
  type PermissionsString,
  ChannelType,
  PermissionFlagsBits,
  ContainerBuilder,
  TextDisplayBuilder,
  SeparatorBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { CommandHandler } from '../../handlers/command.js';
import { createChildLogger } from '../../utils/logger.js';
import { getEnv } from '../../config/env.js';
import {
  createSuggestion,
  reviewSuggestion,
  updateSuggestionApprovalMessage,
  updateSuggestionPublicationMessage,
  findSuggestionByNumber,
} from '../../services/suggestion.js';
import { discoverStaffRoles } from '../../services/staff.js';
import {
  createTicket,
  claimTicket,
  closeTicket,
  hasOpenTicketAny,
  findTicketByChannel,
  updateTicketChannel,
  updateTicketMessage,
  saveTranscript,
  type TicketCategory,
} from '../../services/ticket.js';
import { generateTranscript } from '../../services/transcript.js';
import { checkPremium } from '../../services/premium.js';
import {
  buildSuggestionApprovalContainer,
  buildSuggestionResolvedContainer,
  buildSuggestionPublishedContainer,
} from '../../panels/suggestion.js';
import {
  buildTicketCreatedContainer,
  buildTicketClaimedContainer,
  buildTicketCloseConfirmContainer,
} from '../../panels/ticket.js';
import { buildAdvertisementPublishedContainer } from '../../panels/advertisement.js';
import { sendModLog, sendBotLog, LogColors } from '../../services/logger/discord.js';
import { Emojis } from '../../config/emojis.js';

const log = createChildLogger('INTERACTION');

const CV2 = 32768;

let commandHandler: CommandHandler | null = null;

export function setCommandHandler(handler: CommandHandler): void {
  commandHandler = handler;
}

function buildErrorContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(LogColors.ERROR)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${Emojis.hata} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

function buildSuccessContainer(title: string, description: string): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(LogColors.SUCCESS)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${Emojis.basari} ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(description));
}

function isModOrAdmin(member: GuildMember): boolean {
  return (
    member.permissions.has(PermissionFlagsBits.Administrator) ||
    member.permissions.has(PermissionFlagsBits.ModerateMembers) ||
    member.permissions.has(PermissionFlagsBits.ManageGuild)
  );
}

async function hasStaffRole(
  guild: import('discord.js').Guild,
  member: GuildMember,
): Promise<boolean> {
  const staffRoles = await discoverStaffRoles(guild);
  if (!staffRoles || staffRoles.length === 0) return false;
  return member.roles.cache.some((role) => staffRoles.includes(role.id));
}

async function isStaff(guild: import('discord.js').Guild, member: GuildMember): Promise<boolean> {
  return isModOrAdmin(member) || (await hasStaffRole(guild, member));
}

async function reviewAndResolve(
  interaction: StringSelectMenuInteraction | ModalSubmitInteraction,
  suggestionNumber: number,
  status: 'approved' | 'rejected',
  rejectionReason?: string,
): Promise<void> {
  if (!interaction.guild) return;

  const env = getEnv();
  const suggestion = await findSuggestionByNumber(interaction.guild.id, suggestionNumber);
  if (!suggestion) {
    await interaction.reply({
      components: [buildErrorContainer('Hata', 'Öneri bulunamadı.')],
      flags: CV2,
      ephemeral: true,
    });
    return;
  }

  const review = await reviewSuggestion(
    interaction.guild.id,
    suggestionNumber,
    status,
    interaction.user.id,
    rejectionReason,
  );

  if (!review.success) {
    const msg =
      review.error === 'Öneri bulunamadı.'
        ? review.error
        : review.status && review.status !== 'pending'
          ? 'Bu öneri zaten sonuçlandırılmış.'
          : review.error;
    await interaction.reply({
      components: [buildErrorContainer('Sonuçlandırıldı', msg ?? 'Öneri sonuçlandırılamadı.')],
      flags: CV2,
      ephemeral: true,
    });
    return;
  }

  const resolvedContainer = buildSuggestionResolvedContainer(
    suggestionNumber,
    suggestion.title,
    suggestion.content,
    suggestion.userId,
    status,
    interaction.user.id,
    new Date(),
    rejectionReason,
  );

  try {
    if (interaction.message?.editable) {
      await interaction.message.edit({ components: [resolvedContainer] });
    } else if (
      suggestion.approvalMessageId &&
      suggestion.approvalChannelId &&
      interaction.channel
    ) {
      const ch = interaction.channel;
      if (ch.isTextBased()) {
        const approvalMsg = await ch.messages.fetch(suggestion.approvalMessageId);
        await approvalMsg.edit({ components: [resolvedContainer] });
      }
    }
  } catch (error) {
    log.error(
      'Failed to update approval message for suggestion #%d: %s',
      suggestionNumber,
      error instanceof Error ? error.message : String(error),
    );
  }

  if (status === 'approved') {
    const publicationChannelId = env.SUGGESTION_OUTPUT_CHANNEL_ID;
    if (publicationChannelId) {
      let publicationChannel;
      try {
        publicationChannel = await interaction.guild.channels.fetch(publicationChannelId);
      } catch {
        publicationChannel = null;
      }

      if (publicationChannel && publicationChannel.isTextBased()) {
        const published = buildSuggestionPublishedContainer(
          suggestionNumber,
          suggestion.title,
          suggestion.content,
          suggestion.userId,
          interaction.user.id,
          new Date(),
        );
        const pubMsg = await publicationChannel.send({
          components: [published],
          flags: CV2,
        });
        await updateSuggestionPublicationMessage(
          interaction.guild.id,
          suggestionNumber,
          pubMsg.id,
          publicationChannel.id,
        );
      } else {
        log.error('Suggestion publication channel not found for #%d', suggestionNumber);
      }
    }
  }

  await interaction.reply({
    components: [
      buildSuccessContainer(
        status === 'approved' ? 'Onaylandı' : 'Reddedildi',
        status === 'approved'
          ? `Öneri #${suggestionNumber} onaylandı ve yayınlandı.`
          : `Öneri #${suggestionNumber} reddedildi.`,
      ),
    ],
    flags: CV2,
    ephemeral: true,
  });
}

function buildLogContainer(title: string, fields: string[]): ContainerBuilder {
  return new ContainerBuilder()
    .setAccentColor(LogColors.INFO)
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}`))
    .addSeparatorComponents(new SeparatorBuilder().setDivider(true).setSpacing(1))
    .addTextDisplayComponents(new TextDisplayBuilder().setContent(fields.join('\n')));
}

const TICKET_CATEGORIES: Record<string, TicketCategory> = {
  ticket_open_general: 'general',
  ticket_open_bug: 'bug',
  ticket_open_premium: 'premium',
  ticket_open_partnership: 'partnership',
  ticket_open_advertisement: 'advertisement',
};

function sanitizeChannelName(name: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-_]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
  return cleaned.slice(0, 60) || 'talep';
}

async function handleTicketOpen(
  interaction: ButtonInteraction | StringSelectMenuInteraction,
  category: TicketCategory,
): Promise<void> {
  if (!interaction.guild || !interaction.member) return;

  const guild = interaction.guild;
  const userId = interaction.user.id;

  if (category === 'premium') {
    const premium = await checkPremium(guild.id, userId);
    if (!premium.isPremium) {
      await interaction.reply({
        components: [
          buildErrorContainer(
            'Premium Gerekli',
            'Premium Destek yalnızca Premium üyeler için kullanılabilir.',
          ),
        ],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }
  }

  const existing = await hasOpenTicketAny(guild.id, userId);
  if (existing) {
    await interaction.reply({
      components: [
        buildErrorContainer(
          'Açık Talep Bulundu',
          `Zaten açık bir destek talebiniz bulunuyor.\nLütfen mevcut destek talebiniz üzerinden bizimle iletişime geçin.\nKanal: <#${existing.channelId}>`,
        ),
      ],
      flags: CV2,
      ephemeral: true,
    });
    return;
  }

  const modal = new ModalBuilder()
    .setCustomId(`ticket_create_${category}`)
    .setTitle('Destek Talebi');

  const descriptionInput = new TextInputBuilder()
    .setCustomId('ticket_description')
    .setLabel('Sorununuz veya talebiniz nedir?')
    .setPlaceholder('Size nasıl yardımcı olabiliriz?')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false)
    .setMaxLength(500);

  modal.addComponents(new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput));

  await interaction.showModal(modal);
}

async function createTicketChannel(
  interaction: ModalSubmitInteraction,
  category: TicketCategory,
  description: string,
): Promise<void> {
  if (!interaction.guild || !interaction.member) return;

  const env = getEnv();
  const guild = interaction.guild;
  const userId = interaction.user.id;

  if (category === 'premium') {
    const premium = await checkPremium(guild.id, userId);
    if (!premium.isPremium) {
      await interaction.reply({
        components: [
          buildErrorContainer(
            'Premium Gerekli',
            'Premium Destek yalnızca Premium üyeler için kullanılabilir.',
          ),
        ],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }
  }

  const existing = await hasOpenTicketAny(guild.id, userId);
  if (existing) {
    await interaction.reply({
      components: [
        buildErrorContainer(
          'Açık Talep Bulundu',
          `Zaten açık bir destek talebiniz bulunuyor.\nLütfen mevcut destek talebiniz üzerinden bizimle iletişime geçin.\nKanal: <#${existing.channelId}>`,
        ),
      ],
      flags: CV2,
      ephemeral: true,
    });
    return;
  }

  const result = await createTicket(guild.id, userId, category);
  if (!result.success || !result.ticketNumber) {
    await interaction.reply({
      components: [buildErrorContainer('Hata', result.error ?? 'Talep oluşturulamadı.')],
      flags: CV2,
      ephemeral: true,
    });
    return;
  }

  const ticketNumber = result.ticketNumber;
  const member = interaction.member as GuildMember;
  const userName = member.displayName || interaction.user.username;
  const channelName = `ticket-${sanitizeChannelName(userName)}-${ticketNumber}`;

  type OverwriteEntry = {
    id: string;
    allow?: readonly PermissionsString[];
    deny?: readonly PermissionsString[];
  };

  const botOverwrites = [
    'ViewChannel',
    'SendMessages',
    'ManageChannels',
    'ManageMessages',
    'ReadMessageHistory',
    'AttachFiles',
    'EmbedLinks',
  ] as const;

  const clientId = interaction.guild.members.me!.id;

  const overwrites: OverwriteEntry[] = [
    { id: guild.id, deny: ['ViewChannel'] as const },
    {
      id: userId,
      allow: [
        'ViewChannel',
        'SendMessages',
        'ReadMessageHistory',
        'AttachFiles',
        'EmbedLinks',
      ] as const,
    },
    {
      id: clientId,
      allow: botOverwrites,
    },
  ];

  let staffRoles: string[] | null = [];
  try {
    staffRoles = (await discoverStaffRoles(guild, 4)) ?? [];
  } catch {
    staffRoles = [];
  }

  for (const roleId of staffRoles) {
    if (roleId === guild.id) continue;
    if (overwrites.some((o) => o.id === roleId)) continue;
    overwrites.push({
      id: roleId,
      allow: [
        'ViewChannel',
        'SendMessages',
        'ReadMessageHistory',
        'AttachFiles',
        'EmbedLinks',
      ] as const,
    });
  }

  const ticketChannel = await guild.channels.create({
    name: channelName,
    type: ChannelType.GuildText,
    parent: env.TICKET_CATEGORY_ID ?? undefined,
    permissionOverwrites: overwrites,
  });

  await updateTicketChannel(guild.id, ticketNumber, ticketChannel.id);

  const ticketContainer = buildTicketCreatedContainer(ticketNumber, category, userId, description);
  const msg = await ticketChannel.send({
    components: [ticketContainer],
    flags: CV2,
  });

  await updateTicketMessage(guild.id, ticketNumber, msg.id);

  await interaction.reply({
    components: [
      buildSuccessContainer(
        'Talep Oluşturuldu',
        `Destek talebiniz oluşturuldu: <#${ticketChannel.id}>`,
      ),
    ],
    flags: CV2,
    ephemeral: true,
  });

  const logContainer = buildLogContainer('🎫 Yeni Ticket', [
    `**Kullanıcı:** <@${userId}>`,
    `**Tür:** ${category}`,
    `**Kanal:** <#${ticketChannel.id}>`,
    `**Ticket ID:** #${ticketNumber}`,
    description ? `**Açıklama:** ${description}` : '',
  ]);
  await sendBotLog(undefined, [logContainer]).catch(() => null);
}

async function handleSuggestionSubmit(interaction: Interaction): Promise<void> {
  if (!interaction.isButton()) return;

  const modal = new ModalBuilder().setCustomId('suggestion_modal').setTitle('💡 Öneri Gönder');

  const titleInput = new TextInputBuilder()
    .setCustomId('suggestion_title')
    .setLabel('Öneri Başlığı')
    .setPlaceholder('Önerinizin kısa bir başlığını yazın')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const contentInput = new TextInputBuilder()
    .setCustomId('suggestion_content')
    .setLabel('Öneri İçeriği')
    .setPlaceholder('Önerinizi detaylı açıklayın')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(1000);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(titleInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(contentInput),
  );

  await interaction.showModal(modal);
}

async function handleAdvertisementSubmit(interaction: Interaction): Promise<void> {
  if (!interaction.isButton()) return;

  const modal = new ModalBuilder().setCustomId('advertisement_modal').setTitle('📢 Reklam Talebi');

  const serverNameInput = new TextInputBuilder()
    .setCustomId('advertisement_server_name')
    .setLabel('Sunucu / Proje Adı')
    .setPlaceholder('Tanıtmak istediğiniz sunucu veya projenin adı')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const inviteLinkInput = new TextInputBuilder()
    .setCustomId('advertisement_invite_link')
    .setLabel('Davet Bağlantısı')
    .setPlaceholder('https://discord.gg/...')
    .setStyle(TextInputStyle.Short)
    .setRequired(true)
    .setMaxLength(100);

  const descriptionInput = new TextInputBuilder()
    .setCustomId('advertisement_description')
    .setLabel('Reklam Açıklaması')
    .setPlaceholder('Sunucunuz veya projeniz hakkında kısa bilgi')
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(true)
    .setMaxLength(500);

  modal.addComponents(
    new ActionRowBuilder<TextInputBuilder>().addComponents(serverNameInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(inviteLinkInput),
    new ActionRowBuilder<TextInputBuilder>().addComponents(descriptionInput),
  );

  await interaction.showModal(modal);
}

async function handleModalSubmit(interaction: Interaction): Promise<void> {
  if (!interaction.isModalSubmit() || !interaction.guild) return;

  const env = getEnv();

  if (interaction.customId.startsWith('ticket_create_')) {
    const category = interaction.customId.replace('ticket_create_', '') as TicketCategory;
    const valid: TicketCategory[] = ['general', 'bug', 'premium', 'partnership', 'advertisement'];
    if (!valid.includes(category)) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Geçersiz talep kategorisi.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }
    const description = interaction.fields.getTextInputValue('ticket_description') ?? '';
    await createTicketChannel(interaction, category, description);
    return;
  }

  if (interaction.customId === 'suggestion_modal') {
    const title = interaction.fields.getTextInputValue('suggestion_title');
    const content = interaction.fields.getTextInputValue('suggestion_content');

    const result = await createSuggestion(
      interaction.guild.id,
      interaction.user.id,
      title,
      content,
    );
    if (!result.success || !result.suggestionNumber) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', result.error ?? 'Öneri kaydedilemedi.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    const approvalChannelId = env.SUGGESTION_APPROVAL_CHANNEL_ID;
    if (!approvalChannelId) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Öneri onay kanalı yapılandırılmamış.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    let approvalChannel;
    try {
      approvalChannel = await interaction.guild.channels.fetch(approvalChannelId);
    } catch {
      approvalChannel = null;
    }

    if (!approvalChannel || !approvalChannel.isTextBased()) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Öneri onay kanalı bulunamadı.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    const staffRoles = await discoverStaffRoles(interaction.guild);
    const staffMentions = staffRoles?.map((id) => `<@&${id}>`).join(' ') ?? '';

    const container = buildSuggestionApprovalContainer(
      result.suggestionNumber,
      title,
      content,
      interaction.user.id,
      staffMentions,
    );
    const msg = await approvalChannel.send({
      components: [container],
      flags: CV2,
    });

    await updateSuggestionApprovalMessage(
      interaction.guild.id,
      result.suggestionNumber,
      msg.id,
      approvalChannel.id,
    );

    await interaction.reply({
      components: [
        buildSuccessContainer(
          'Öneri Gönderildi',
          `Öneriniz #${result.suggestionNumber} numarasıyla kaydedildi ve onay için yetkililere iletildi.`,
        ),
      ],
      flags: CV2,
      ephemeral: true,
    });

    const logContainer = buildLogContainer('💡 Yeni Öneri', [
      `**Kullanıcı:** <@${interaction.user.id}>`,
      `**Başlık:** ${title}`,
      `**Öneri:** #${result.suggestionNumber}`,
      `**Durum:** Onay Bekliyor`,
    ]);
    await sendModLog(undefined, [logContainer]).catch(() => null);
  }

  if (interaction.customId === 'suggestion_reject_modal') {
    const suggestionNumber = parseInt(
      interaction.fields.getTextInputValue('suggestion_reject_number'),
      10,
    );
    const reason = interaction.fields.getTextInputValue('suggestion_reject_reason');

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!isModOrAdmin(member) && !(await hasStaffRole(interaction.guild, member))) {
      await interaction.reply({
        components: [buildErrorContainer('Yetersiz Yetki', 'Bu işlemi yapmak için yetkiniz yok.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    await reviewAndResolve(interaction, suggestionNumber, 'rejected', reason);
  }

  if (interaction.customId === 'advertisement_modal') {
    const serverName = interaction.fields.getTextInputValue('advertisement_server_name');
    const inviteLink = interaction.fields.getTextInputValue('advertisement_invite_link');
    const description = interaction.fields.getTextInputValue('advertisement_description');

    const result = await createTicket(interaction.guild.id, interaction.user.id, 'advertisement');
    if (!result.success || !result.ticketNumber) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', result.error ?? 'Talep oluşturulamadı.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    const adChannelId = env.ADVERTISEMENT_CHANNEL_ID;
    if (!adChannelId) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Reklam kanalı yapılandırılmamış.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    let outputChannel;
    try {
      outputChannel = await interaction.guild.channels.fetch(adChannelId);
    } catch {
      outputChannel = null;
    }

    if (!outputChannel || !outputChannel.isTextBased()) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Reklam kanalı bulunamadı.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    const container = buildAdvertisementPublishedContainer(
      result.ticketNumber,
      serverName,
      inviteLink,
      description,
      interaction.user.id,
    );
    const msg = await outputChannel.send({
      components: [container],
      flags: CV2,
    });

    await updateTicketMessage(interaction.guild.id, result.ticketNumber, msg.id);

    await interaction.reply({
      components: [
        buildSuccessContainer(
          'Talep Gönderildi',
          `Reklam talebiniz #${result.ticketNumber} numarasıyla kaydedildi.`,
        ),
      ],
      flags: CV2,
      ephemeral: true,
    });

    const logContainer = buildLogContainer('📢 Reklam Talebi', [
      `**Kullanıcı:** <@${interaction.user.id}>`,
      `**Sunucu:** ${serverName}`,
      `**Talep:** #${result.ticketNumber}`,
    ]);
    await sendModLog(undefined, [logContainer]).catch(() => null);
  }
}

async function handleButtonInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isButton() || !interaction.guild) return;

  const { customId } = interaction;

  if (customId === 'suggestion_submit') {
    await handleSuggestionSubmit(interaction);
    return;
  }

  if (customId === 'advertisement_submit') {
    await handleAdvertisementSubmit(interaction);
    return;
  }

  if (customId.startsWith('ticket_open_')) {
    const category = TICKET_CATEGORIES[customId];
    if (category) {
      await handleTicketOpen(interaction, category);
    }
    return;
  }

  if (customId.startsWith('ticket_claim_')) {
    const ticketNumber = parseInt(customId.replace('ticket_claim_', ''), 10);
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!(await isStaff(interaction.guild, member))) {
      await interaction.reply({
        components: [buildErrorContainer('Yetersiz Yetki', 'Bu işlemi yapmak için yetkiniz yok.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    const ticket = await findTicketByChannel(interaction.channel?.id ?? '');
    if (!ticket || ticket.ticketNumber !== ticketNumber) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Ticket bulunamadı.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    if (ticket.claimedBy) {
      await interaction.reply({
        components: [
          buildErrorContainer(
            'Zaten Atanmış',
            `Bu ticket zaten <@${ticket.claimedBy}> tarafından üzerine alınmış.`,
          ),
        ],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    const claimResult = await claimTicket(interaction.guild.id, ticketNumber, interaction.user.id);
    if (!claimResult.success) {
      const msg =
        claimResult.error === 'claimed'
          ? 'Bu ticket az önce başka bir yetkili tarafından üzerine alındı.'
          : (claimResult.error ?? 'Talep üzerine alınamadı.');
      await interaction.reply({
        components: [buildErrorContainer('Hata', msg)],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      components: [
        buildSuccessContainer('Üzerine Alındı', `Ticket #${ticketNumber} üzerinize alındı.`),
      ],
      flags: CV2,
      ephemeral: true,
    });

    try {
      await interaction.channel?.messages.fetch(ticket.messageId ?? '').then(async (msg) => {
        await msg.edit({
          components: [
            buildTicketClaimedContainer(
              ticket.ticketNumber,
              ticket.category as TicketCategory,
              ticket.userId,
              interaction.user.id,
              undefined,
            ),
          ],
        });
      });
    } catch {
      /* ignore */
    }

    const claimLog = buildLogContainer('Ticket Üstlenildi', [
      `**Ticket:** #${ticketNumber}`,
      `**Yetkili:** <@${interaction.user.id}>`,
      `**Kanal:** <#${interaction.channel?.id}>`,
    ]);
    await sendBotLog(undefined, [claimLog]).catch(() => null);
    return;
  }

  if (customId.startsWith('ticket_transcript_')) {
    const ticketNumber = parseInt(customId.replace('ticket_transcript_', ''), 10);
    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!(await isStaff(interaction.guild, member))) {
      await interaction.reply({
        components: [buildErrorContainer('Yetersiz Yetki', 'Bu işlemi yapmak için yetkiniz yok.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    if (!interaction.channel) return;
    const data = await generateTranscript(interaction.channel);
    const text =
      data.count > 0 ? data.text : 'Bu kanal için transcript oluşturulamadı veya mesaj bulunamadı.';

    await interaction.reply({
      components: [buildSuccessContainer('Transcript', `**${data.count}** mesaj yakalandı.`)],
      flags: CV2,
      ephemeral: true,
    });

    await sendBotLog(undefined, [
      buildLogContainer(`Ticket #${ticketNumber} Transcript`, [
        `**Kanal:** <#${interaction.channel.id}>` + '\n' + `\`\`\`\n${text.slice(0, 1800)}\n\`\`\``,
      ]),
    ]).catch(() => null);
    return;
  }

  if (
    customId.startsWith('ticket_close_') &&
    !customId.includes('confirm') &&
    !customId.includes('cancel')
  ) {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const ticket = await findTicketByChannel(interaction.channel?.id ?? '');
    const isOwner = ticket && ticket.userId === interaction.user.id;
    const isStaffMember = await isStaff(interaction.guild, member);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isStaffMember && !isAdmin) {
      await interaction.reply({
        components: [buildErrorContainer('Yetersiz Yetki', 'Bu işlemi yapmak için yetkiniz yok.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      components: [buildTicketCloseConfirmContainer()],
      flags: CV2,
      ephemeral: true,
    });
    return;
  }

  if (customId === 'ticket_close_confirm') {
    const member = await interaction.guild.members.fetch(interaction.user.id);
    const ticket = await findTicketByChannel(interaction.channel?.id ?? '');
    const isOwner = ticket && ticket.userId === interaction.user.id;
    const isStaffMember = await isStaff(interaction.guild, member);
    const isAdmin = member.permissions.has(PermissionFlagsBits.Administrator);

    if (!isOwner && !isStaffMember && !isAdmin) {
      await interaction.reply({
        components: [buildErrorContainer('Yetersiz Yetki', 'Bu işlemi yapmak için yetkiniz yok.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    if (!ticket) {
      await interaction.reply({
        components: [buildErrorContainer('Hata', 'Ticket bulunamadı.')],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    let transcriptText = '';
    if (interaction.channel) {
      const data = await generateTranscript(interaction.channel);
      transcriptText = `${data.text}\n\n[Toplam Mesaj: ${data.count}]`;
      await saveTranscript(interaction.guild.id, ticket.ticketNumber, transcriptText);
    }

    const closedResult = await closeTicket(
      interaction.guild.id,
      ticket.ticketNumber,
      interaction.user.id,
      transcriptText,
    );

    await interaction.reply({
      components: [buildSuccessContainer('Kapatıldı', 'Destek talebi kapatılıyor...')],
      flags: CV2,
    });

    const closeLog = buildLogContainer(`Ticket #${ticket.ticketNumber} Kapatıldı`, [
      ticket.claimedBy ? `**Sorumlu Yetkili:** <@${ticket.claimedBy}>` : '',
      `**Kapatıldı:** <@${interaction.user.id}>`,
      `**Kanal:** <#${interaction.channel?.id}>`,
      closedResult ? '**Transcript:** Kaydedildi' : '**Transcript:** Kaydedilemedi',
    ]);
    await sendBotLog(undefined, [closeLog]).catch(() => null);

    setTimeout(() => {
      interaction.guild?.channels.delete(interaction.channel?.id ?? '').catch(() => null);
    }, 3000);
    return;
  }

  if (customId === 'ticket_close_cancel') {
    await interaction.update({ components: [] });
    return;
  }
}

async function handleSelectMenuInteraction(interaction: Interaction): Promise<void> {
  if (!interaction.isStringSelectMenu() || !interaction.guild) return;

  const { customId } = interaction;
  const value = interaction.values[0];

  if (customId === 'ticket_category_select') {
    const category = value as TicketCategory;
    await handleTicketOpen(interaction, category);
    return;
  }

  if (customId.startsWith('suggestion_approval_select_')) {
    const suggestionNumber = parseInt(customId.replace('suggestion_approval_select_', ''), 10);
    const action = value as 'approve' | 'reject';

    const member = await interaction.guild.members.fetch(interaction.user.id);
    if (!(await isStaff(interaction.guild, member))) {
      await interaction.reply({
        components: [
          buildErrorContainer(
            'Yetersiz Yetki',
            'Bu işlemi gerçekleştirmek için yetkiniz bulunmuyor.',
          ),
        ],
        flags: CV2,
        ephemeral: true,
      });
      return;
    }

    if (action === 'reject') {
      const modal = new ModalBuilder()
        .setCustomId('suggestion_reject_modal')
        .setTitle('Öneri Reddetme Sebebi');

      const numberInput = new TextInputBuilder()
        .setCustomId('suggestion_reject_number')
        .setLabel('Öneri Numarası')
        .setValue(String(suggestionNumber))
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const reasonInput = new TextInputBuilder()
        .setCustomId('suggestion_reject_reason')
        .setLabel('Reddetme Sebebi')
        .setPlaceholder('Öneriyi neden reddediyorsunuz?')
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true)
        .setMaxLength(200);

      modal.addComponents(
        new ActionRowBuilder<TextInputBuilder>().addComponents(numberInput),
        new ActionRowBuilder<TextInputBuilder>().addComponents(reasonInput),
      );

      await interaction.showModal(modal);
      return;
    }

    await reviewAndResolve(interaction, suggestionNumber, 'approved');
  }
}

export default {
  name: Events.InteractionCreate,
  once: false,
  async execute(interaction: Interaction): Promise<void> {
    if (interaction.isModalSubmit()) {
      await handleModalSubmit(interaction);
      return;
    }

    if (interaction.isButton()) {
      await handleButtonInteraction(interaction);
      return;
    }

    if (interaction.isStringSelectMenu()) {
      await handleSelectMenuInteraction(interaction);
      return;
    }

    if (!interaction.isChatInputCommand()) return;

    if (!commandHandler) {
      log.warn('Command handler not set.');
      return;
    }

    const command = commandHandler.commands.get(interaction.commandName);
    if (!command) {
      log.warn('Unknown command: %s', interaction.commandName);
      return;
    }

    const guild = interaction.guild;
    let member: GuildMember | null = null;

    if (guild && interaction.member) {
      try {
        member = await guild.members.fetch(interaction.user.id);
      } catch {
        member = null;
      }
    }

    try {
      await command.execute({
        interaction,
        client: interaction.client,
        guild: guild ?? null,
        member,
      });
    } catch (error) {
      log.error(
        'Error executing command %s: %s',
        interaction.commandName,
        error instanceof Error ? error.message : String(error),
      );

      const reply = {
        content: 'Komut çalıştırılırken bir hata oluştu.',
        ephemeral: true,
      };

      try {
        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply);
        } else {
          await interaction.reply(reply);
        }
      } catch {
        log.error('Failed to send error response for command %s', interaction.commandName);
      }
    }
  },
};
