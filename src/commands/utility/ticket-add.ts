import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ticket-add',
    description: 'Destek talebine kullanıcı ekler.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ticket-add')
    .setDescription('Destek talebine kullanıcı ekler.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Eklenecek kullanıcı').setRequired(true),
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
      ViewChannel: true,
      SendMessages: true,
      ReadMessageHistory: true,
      AttachFiles: true,
      EmbedLinks: true,
    });

    const embed = CyberEmbed.success('Kullanıcı Eklendi')
      .addFields(
        { name: 'Talep No', value: `\`#${ticket.id.slice(-6).toUpperCase()}\``, inline: true },
        { name: 'Eklenen', value: `${targetUser.tag}`, inline: true },
        { name: 'Ekleyen', value: `${member.user.tag}`, inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
