import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'leave-config',
    description: 'Ayrılma mesajını yapılandırır.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('leave-config')
    .setDescription('Ayrılma mesajını yapılandırır.')
    .addBooleanOption((option) =>
      option.setName('durum').setDescription('Ayrılma mesajını aktif/pasif yap').setRequired(true),
    )
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Ayrılma mesajı gönderilecek kanal').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('mesaj').setDescription('Ayrılma mesajı (değişkenler: {user}, {guild})').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const enabled = interaction.options.getBoolean('durum', true);
    const channel = interaction.options.getChannel('kanal');
    const message = interaction.options.getString('mesaj');

    const db = getPrisma();

    const data: {
      leaveEnabled: boolean;
      leaveChannelId?: string;
      leaveMessage?: string;
    } = {
      leaveEnabled: enabled,
    };

    if (channel) {
      data.leaveChannelId = channel.id;
    }

    if (message !== null && message !== undefined) {
      data.leaveMessage = message;
    }

    await db.guildSettings.upsert({
      where: { guildId: guild.id },
      update: data,
      create: {
        guildId: guild.id,
        ...data,
      },
    });

    const actionLabels: Record<string, string> = {
      true: 'Aktif',
      false: 'Pasif',
    };

    const embed = CyberEmbed.success('Ayrılma Ayarları Güncellendi')
      .addFields(
        { name: 'Durum', value: actionLabels[String(enabled)] || '', inline: true },
        { name: 'Kanal', value: channel ? `<#${channel.id}>` : 'Değiştirilmedi', inline: true },
        { name: 'Mesaj', value: message || 'Değiştirilmedi', inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
