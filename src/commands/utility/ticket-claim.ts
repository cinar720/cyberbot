import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ticket-claim',
    description: 'Destek talebini üstlenir.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket-claim')
    .setDescription('Destek talebini üstlenir.'),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const db = getPrisma();

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const ticket = await db.ticket.findFirst({
      where: {
        guildId: guild.id,
        channelId: interaction.channelId,
        status: 'OPEN',
      },
    });

    if (!ticket) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Bu kanal aktif bir destek talebi değil.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Bu kanal aktif bir destek talebi değil.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    if (ticket.assignedTo && ticket.assignedTo !== member.id) {
      const assignee = await guild.members.fetch(ticket.assignedTo).catch(() => null);
      await (deferred ? interaction.editReply({
        embeds: [
          CyberEmbed.warning(
            'Zaten Üstlenildi',
            `Bu destek talebi zaten **${assignee?.user.tag || 'Bilinmeyen Kullanıcı'}** tarafından üstlenilmiştir.`,
          ),
        ],
      }) : interaction.followUp({ ...{
        embeds: [
          CyberEmbed.warning(
            'Zaten Üstlenildi',
            `Bu destek talebi zaten **${assignee?.user.tag || 'Bilinmeyen Kullanıcı'}** tarafından üstlenilmiştir.`,
          ),
        ],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    if (ticket.assignedTo === member.id) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.warning('Bilgi', 'Bu destek talebi zaten sizin tarafınızdan üstlenilmiştir.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.warning('Bilgi', 'Bu destek talebi zaten sizin tarafınızdan üstlenilmiştir.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    await db.ticket.update({
      where: { id: ticket.id },
      data: {
        assignedTo: member.id,
      },
    });

    const embed = CyberEmbed.success('Destek Talebi Üstlenildi')
      .addFields(
        { name: 'Talep No', value: `\`#${ticket.id.slice(-6).toUpperCase()}\``, inline: true },
        { name: 'Üstlenen', value: `${member.user.tag}`, inline: true },
        { name: 'Kategori', value: ticket.category || 'Genel', inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));

    const claimEmbed = CyberEmbed.info('Destek Talebi Üstlenildi')
      .setDescription(
        `Bu destek talebi **${member.user.tag}** tarafından üstlenildi.\nArtık size yardımcı olmakla sorumlu.`,
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (interaction.channel?.isTextBased() && 'send' in interaction.channel) {
      await interaction.channel.send({ embeds: [claimEmbed] }).catch(() => null);
    }
  },
} satisfies SlashCommand;
