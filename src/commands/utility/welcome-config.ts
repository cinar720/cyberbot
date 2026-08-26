import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'welcome-config',
    description: 'Hoşgeldin mesajını yapılandırır.',
    category: 'utility',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageGuild],
    botPermissions: [],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('welcome-config')
    .setDescription('Hoşgeldin mesajını yapılandırır.')
    .addBooleanOption((option) =>
      option.setName('durum').setDescription('Hoşgeldin mesajını aktif/pasif yap').setRequired(true),
    )
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Hoşgeldin mesajı gönderilecek kanal').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('mesaj').setDescription('Hoşgeldin mesajı (değişkenler: {user}, {guild}, {channel})').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute({ interaction, guild, member }: CommandContext) {
    if (!guild || !member) return;

    const enabled = interaction.options.getBoolean('durum', true);
    const channel = interaction.options.getChannel('kanal');
    const message = interaction.options.getString('mesaj');

    const db = getPrisma();

    const data: {
      welcomeEnabled: boolean;
      welcomeChannelId?: string;
      welcomeMessage?: string;
    } = {
      welcomeEnabled: enabled,
    };

    if (channel) {
      data.welcomeChannelId = channel.id;
    }

    if (message !== null && message !== undefined) {
      data.welcomeMessage = message;
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

    const embed = CyberEmbed.success('Hoşgeldin Ayarları Güncellendi')
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
