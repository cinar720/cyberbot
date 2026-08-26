import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'purge',
    description: 'Kanalda toplu mesaj silme işlemi yapar.',
    category: 'moderation',
    cooldown: 10,
    permissions: [PermissionFlagsBits.ManageMessages],
    botPermissions: [PermissionFlagsBits.ManageMessages],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('purge')
    .setDescription('Kanalda toplu mesaj silme işlemi yapar.')
    .addIntegerOption((option) =>
      option.setName('miktar').setDescription('Silinecek mesaj sayısı').setRequired(true).setMinValue(1).setMaxValue(100),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Silme sebebi').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const amount = interaction.options.getInteger('miktar', true);
    const reason = interaction.options.getString('sebep') || 'Toplu mesaj silme';

    await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

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
      'PURGE',
      { reason, amount, channelId: interaction.channel?.id }
    );

    if (!result.success) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      });
      return;
    }

    // Embed oluştur
    const embed = CyberEmbed.success('Mesajlar Silindi')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Miktar', value: `${amount}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
