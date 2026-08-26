import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'slowmode',
    description: 'Kanalın yavaş modunu ayarlar.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('slowmode')
    .setDescription('Kanalın yavaş modunu ayarlar.')
    .addIntegerOption((option) =>
      option.setName('sure').setDescription('Süre (saniye, 0 = kapat)').setRequired(true).setMinValue(0).setMaxValue(21600),
    )
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Hedef kanal (varsayılan: mevcut kanal)').addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Sebep').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const duration = interaction.options.getInteger('sure', true);
    const channel = interaction.options.getChannel('kanal') || interaction.channel;
    const reason = interaction.options.getString('sebep') || 'Yavaş mod ayarlandı';

    if (!channel || !('rateLimitPerUser' in channel)) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Geçersiz kanal.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferReply();

    // DB'ye kaydet
    await getOrCreateGuild(guild);

    // Süre formatını DurationService ile çevir
    const durationStr = duration === 0 ? '0s' : `${duration}s`;

    // PolicyService.execute üzerinden çalıştır
    const botMember = await guild.members.fetch(interaction.client.user.id);
    const result = await PolicyService.execute(
      {
        guild,
        member,
        target: botMember,
        client,
        interaction,
      },
      'SLOWMODE',
      { reason, duration: durationStr, channelId: channel.id }
    );

    if (!result.success) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      });
      return;
    }

    // Embed oluştur
    const embed = CyberEmbed.success('Yavaş Mod Ayarlandı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kanal', value: `${channel}`, inline: true },
        { name: 'Süre', value: duration === 0 ? 'Kapatıldı' : `${duration} saniye`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
