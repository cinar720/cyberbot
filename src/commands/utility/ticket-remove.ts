import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
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

    await interaction.deferReply();

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

    if (targetUser.id === ticket.creatorId) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Destek talebini oluşturan kullanıcı çıkarılamaz.')],
      });
      return;
    }

    if (targetUser.id === interaction.client.user.id) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Bot çıkarılamaz.')],
      });
      return;
    }

    const channel = interaction.channel;
    if (!channel || !('permissionOverwrites' in channel)) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Kanal bulunamadı.')],
      });
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

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
