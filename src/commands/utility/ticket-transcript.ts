import { SlashCommandBuilder, PermissionFlagsBits, AttachmentBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ticket-transcript',
    description: 'Destek talebinin dökümünü oluşturur.',
    category: 'utility',
    cooldown: 10,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket-transcript')
    .setDescription('Destek talebinin dökümünü oluşturur.'),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    let deferred = false;
    try { await interaction.deferReply(); deferred = true; } catch { /* already acknowledged */ }

    const db = getPrisma();

    const ticket = await db.ticket.findFirst({
      where: {
        guildId: guild.id,
        channelId: interaction.channelId,
      },
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Bu kanalda bir destek talebi bulunamadı.')],
      }) : interaction.followUp({ embeds: [CyberEmbed.error('Hata', 'Bu kanalda bir destek talebi bulunamadı.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    if (ticket.messages.length === 0) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Uyarı', 'Bu destek talebinde henüz mesaj bulunmuyor.')],
      }) : interaction.followUp({ embeds: [CyberEmbed.warning('Uyarı', 'Bu destek talebinde henüz mesaj bulunmuyor.')], flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const creator = await guild.members.fetch(ticket.creatorId).catch(() => null);

    let transcript = `=== DESTEK TALEBİ DÖKÜMÜ ===\n`;
    transcript += `Talep No: #${ticket.id.slice(-6).toUpperCase()}\n`;
    transcript += `Kategori: ${ticket.category || 'Genel'}\n`;
    transcript += `Oluşturan: ${creator?.user.tag || 'Bilinmeyen'} (${ticket.creatorId})\n`;
    transcript += `Durum: ${ticket.status}\n`;
    transcript += `Oluşturulma: ${ticket.createdAt.toISOString()}\n`;

    if (ticket.closedAt) {
      transcript += `Kapatılma: ${ticket.closedAt.toISOString()}\n`;
    }

    if (ticket.assignedTo) {
      const assignee = await guild.members.fetch(ticket.assignedTo).catch(() => null);
      transcript += `Üstlenen: ${assignee?.user.tag || 'Bilinmeyen'} (${ticket.assignedTo})\n`;
    }

    transcript += `\n${'='.repeat(50)}\n\n`;

    for (const message of ticket.messages) {
      const author = await guild.members.fetch(message.authorId).catch(() => null);
      const timestamp = message.createdAt.toISOString();
      const authorName = author?.user.tag || 'Bilinmeyen Kullanıcı';
      transcript += `[${timestamp}] ${authorName}:\n${message.content}\n\n`;
    }

    transcript += `\n${'='.repeat(50)}\n`;
    transcript += `Döküm oluşturulma: ${new Date().toISOString()}\n`;

    const buffer = Buffer.from(transcript, 'utf-8');
    const attachment = new AttachmentBuilder(buffer, {
      name: `ticket-${ticket.id.slice(-6).toUpperCase()}-transcript.txt`,
    });

    const embed = CyberEmbed.success('Döküm Oluşturuldu')
      .addFields(
        { name: 'Talep No', value: `\`#${ticket.id.slice(-6).toUpperCase()}\``, inline: true },
        { name: 'Mesaj Sayısı', value: String(ticket.messages.length), inline: true },
        { name: 'Kategori', value: ticket.category || 'Genel', inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({
      embeds: [embed],
      files: [attachment],
    }) : interaction.followUp({ embeds: [embed], files: [attachment], flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
