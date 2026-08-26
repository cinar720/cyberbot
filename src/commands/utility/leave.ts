import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'leave',
    description: 'Ayrılma mesajı ayarlarını gösterir.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Ayrılma mesajı ayarlarını gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const db = getPrisma();

    const settings = await db.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings) {
      await interaction.reply({
        embeds: [CyberEmbed.info('Ayrılma Ayarları', 'Bu sunucu için ayrılma ayarları yapılandırılmamış.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const guildData = await db.guild.findUnique({
      where: { guildId: guild.id },
    });

    const channel = guildData?.leaveChannelId
      ? await guild.channels.fetch(guildData.leaveChannelId).catch(() => null)
      : null;

    const embed = CyberEmbed.info('Ayrılma Ayarları')
      .addFields(
        { name: 'Durum', value: settings.leaveEnabled ? 'Aktif' : 'Pasif', inline: true },
        { name: 'Kanal', value: channel ? `<#${channel.id}>` : 'Ayarlanmamış', inline: true },
        { name: 'Mesaj', value: settings.leaveMessage || 'Varsayılan mesaj kullanılıyor', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
  },
} satisfies SlashCommand;
