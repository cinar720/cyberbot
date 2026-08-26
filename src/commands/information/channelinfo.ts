import { SlashCommandBuilder, ChannelType, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

const channelTypeMap: Record<number, string> = {
  [ChannelType.GuildText]: 'Metin Kanalı',
  [ChannelType.GuildVoice]: 'Ses Kanalı',
  [ChannelType.GuildCategory]: 'Kategori',
  [ChannelType.GuildAnnouncement]: 'Duyuru Kanalı',
  [ChannelType.GuildStageVoice]: 'Sahne Kanalı',
  [ChannelType.GuildForum]: 'Forum Kanalı',
  [ChannelType.PublicThread]: 'Açık Konu',
  [ChannelType.PrivateThread]: 'Özel Konu',
  [ChannelType.AnnouncementThread]: 'Duyuru Konusu',
};

export default {
  metadata: {
    name: 'channelinfo',
    description: 'Kanal hakkında bilgi gösterir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('channelinfo')
    .setDescription('Kanal hakkında bilgi gösterir.')
    .addChannelOption((option) =>
      option.setName('channel').setDescription('Bilgi gösterilecek kanal'),
    ),

  async execute({ interaction }) {
    const channel = interaction.options.getChannel('channel') ?? interaction.channel;
    if (!channel || !('name' in channel)) {
      await interaction.reply({ embeds: [CyberEmbed.error('Hata', 'Kanal bulunamadı.')], flags: [MessageFlags.Ephemeral] });
      return;
    }

    const type = 'type' in channel ? channelTypeMap[channel.type] ?? 'Bilinmeyen' : 'Bilinmeyen';
    const category = 'parentId' in channel && channel.parentId ? `<#${channel.parentId}>` : 'Yok';
    const topic = 'topic' in channel && channel.topic ? channel.topic : 'Yok';
    const createdTimestamp = 'createdTimestamp' in channel && channel.createdTimestamp != null ? channel.createdTimestamp : Date.now();

    const embed = CyberEmbed.info(`Kanal Bilgisi: ${channel.name}`)
      .addFields(
        { name: 'İsim', value: `\`${channel.name}\``, inline: true },
        { name: 'Tür', value: `\`${type}\``, inline: true },
        { name: 'Kategori', value: category, inline: true },
        { name: 'Oluşturulma', value: `<t:${Math.floor(createdTimestamp / 1000)}:R>`, inline: true },
        { name: 'Konu', value: topic.length > 1024 ? topic.slice(0, 1021) + '...' : topic, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
