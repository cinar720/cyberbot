import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ticket-close',
    description: 'Destek talebini kapatır.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket-close')
    .setDescription('Destek talebini kapatır.')
    .addStringOption((option) =>
      option
        .setName('sebep')
        .setDescription('Kapatma sebebi')
        .setRequired(false),
    ),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const db = getPrisma();

    const ticket = await db.ticket.findFirst({
      where: {
        guildId: guild.id,
        channelId: interaction.channelId,
        status: 'OPEN',
      },
    });

    if (!ticket) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Bu kanal aktif bir destek talebi değil.')],
      });
      return;
    }

    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

    const creator = await guild.members.fetch(ticket.creatorId).catch(() => null);

    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        status: 'CLOSED',
        closedAt: new Date(),
        closedBy: member.id,
      },
    });

    const embed = CyberEmbed.success('Destek Talebi Kapatıldı')
      .addFields(
        { name: 'Talep No', value: `\`#${ticket.id.slice(-6).toUpperCase()}\``, inline: true },
        { name: 'Kategori', value: ticket.category || 'Genel', inline: true },
        { name: 'Kapatıldı', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });

    const closeEmbed = CyberEmbed.warning('Destek Talebi Kapatıldı')
      .setDescription(
        `Bu destek talebi **${member.user.tag}** tarafından kapatıldı.\n` +
          `**Sebep:** ${reason}\n\n` +
          `Kanal 5 dakika sonra otomatik olarak silinecektir.`,
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (interaction.channel?.isTextBased() && 'send' in interaction.channel) {
      await interaction.channel.send({ embeds: [closeEmbed] }).catch(() => null);
    }

    if (creator) {
      const dmEmbed = CyberEmbed.info('Destek Talebiniz Kapatıldı')
        .setDescription(
          `**${guild.name}** sunucusundaki destek talebiniz kapatıldı.\n\n` +
            `**Kategori:** ${ticket.category || 'Genel'}\n` +
            `**Kapatan:** ${member.user.tag}\n` +
            `**Sebep:** ${reason}`,
        )
        .setDefaultFooter()
        .setTimestampNow();

      await creator.send({ embeds: [dmEmbed] }).catch(() => null);
    }

    setTimeout(async () => {
      await guild.channels.delete(interaction.channelId).catch(() => null);
    }, 5 * 60 * 1000);
  },
} satisfies SlashCommand;
