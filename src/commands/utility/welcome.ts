import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'welcome',
    description: 'Hoşgeldin mesajı ayarlarını gösterir.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('welcome')
    .setDescription('Hoşgeldin mesajı ayarlarını gösterir.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild }: CommandContext) {
    if (!guild) return;

    const db = getPrisma();

    const settings = await db.guildSettings.findUnique({
      where: { guildId: guild.id },
    });

    if (!settings) {
      await interaction.reply({
        embeds: [CyberEmbed.info('Hoşgeldin Ayarları', 'Bu sunucu için hoşgeldin ayarları yapılandırılmamış.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const guildData = await db.guild.findUnique({
      where: { guildId: guild.id },
    });

    const channel = guildData?.welcomeChannelId
      ? await guild.channels.fetch(guildData.welcomeChannelId).catch(() => null)
      : null;

    const embed = CyberEmbed.info('Hoşgeldin Ayarları')
      .addFields(
        { name: 'Durum', value: settings.welcomeEnabled ? 'Aktif' : 'Pasif', inline: true },
        { name: 'Kanal', value: channel ? `<#${channel.id}>` : 'Ayarlanmamış', inline: true },
        { name: 'Mesaj', value: settings.welcomeMessage || 'Varsayılan mesaj kullanılıyor', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed], flags: [MessageFlags.Ephemeral] });
  },
} satisfies SlashCommand;
