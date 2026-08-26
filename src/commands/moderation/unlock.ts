import { SlashCommandBuilder, PermissionFlagsBits, ChannelType, GuildChannel, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'unlock',
    description: 'Kanalın kilidini kaldırır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ManageChannels],
    botPermissions: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('unlock')
    .setDescription('Kanalın kilidini kaldırır.')
    .addChannelOption((option) =>
      option.setName('kanal').setDescription('Hedef kanal (varsayılan: mevcut kanal)').addChannelTypes(ChannelType.GuildText),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Kilidi kaldırma sebebi').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const channel = (interaction.options.getChannel('kanal') || interaction.channel) as GuildChannel | null;
    const reason = interaction.options.getString('sebep') || 'Kanal kilidi kaldırıldı';

    if (!channel) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kanal bulunamadı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferReply();

    // DB'ye kaydet
    await getOrCreateGuild(guild);

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
      'UNLOCK',
      { reason, channelId: channel.id }
    );

    if (!result.success) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      });
      return;
    }

    // Embed oluştur
    const embed = CyberEmbed.success('Kanal Kilidi Kaldırıldı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kanal', value: `${channel}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
