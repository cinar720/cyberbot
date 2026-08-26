import { SlashCommandBuilder, PermissionFlagsBits } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'ban',
    description: 'Kullanıcıyı sunucudan yasaklar.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Kullanıcıyı sunucudan yasaklar.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Yasaklanacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Yasaklanma sebebi').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('kullanici', true);
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

    // Hedef member'ı al (sunucuda olmayabilir)
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);

    const botMember = await guild.members.fetch(interaction.client.user.id);

    await interaction.deferReply();

    // DB'ye kaydet
    await getOrCreateGuild(guild);

    // Moderasyon işlemini Policy üzerinden başlat
    const result = await PolicyService.execute(
      {
        guild,
        member,
        target: targetMember || botMember,
        client,
        interaction,
      },
      'BAN',
      { reason }
    );

    if (!result.success) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      });
      return;
    }

    // Embed oluştur
    const embed = CyberEmbed.success('Kullanıcı Yasaklandı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setDefaultFooter()
      .setTimestampNow();

    // Escalation bilgisi
    if (result.escalation) {
      embed.addFields({
        name: 'Escalation',
        value: `Otomatik yükseltme: **${result.escalation.action}** - ${result.escalation.reason}`,
      });
    }

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
