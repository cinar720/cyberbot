import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ticket-remove',
    description: 'Destek talebinden kullanıcı çıkarır.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket-remove')
    .setDescription('Destek talebinden kullanıcı çıkarır.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Çıkarılacak kullanıcı').setRequired(true),
    ),

  async execute({ interaction, member, guild }: CommandContext) {
    if (!guild || !member) return;

    const db = getPrisma();
    const targetUser = interaction.options.getUser('kullanici', true);

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

    if (targetUser.id === ticket.creatorId) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Destek talebini oluşturan kullanıcı çıkarılamaz.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Destek talebini oluşturan kullanıcı çıkarılamaz.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    if (targetUser.id === interaction.client.user.id) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Bot çıkarılamaz.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Bot çıkarılamaz.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    const channel = interaction.channel;
    if (!channel || !('permissionOverwrites' in channel)) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Kanal bulunamadı.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Kanal bulunamadı.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    await channel.permissionOverwrites.edit(targetUser.id, {
      ViewChannel: false,
      SendMessages: false,
      ReadMessageHistory: false,
      AttachFiles: false,
      EmbedLinks: false,
    });

    const embed = CyberEmbed.success('Kullanıcı Çıkarıldı')
      .addFields(
        { name: 'Talep No', value: `\`#${ticket.id.slice(-6).toUpperCase()}\``, inline: true },
        { name: 'Çıkarılan', value: `${targetUser.tag}`, inline: true },
        { name: 'Çıkaran', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
