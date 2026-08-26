import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import { getPrisma } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'unjail',
    description: 'Kullanıcının jail durumunu kaldırır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('unjail')
    .setDescription('Kullanıcının jail durumunu kaldırır.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Jail\'den çıkarılacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Sebep').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('kullanici', true);
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

    // Hedef member'ı al
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Jail rolü kontrolü
    const guildData = await getPrisma().guild.findUnique({ where: { guildId: guild.id } });
    const jailRoleId = guildData?.jailRoleId;
    if (!jailRoleId) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Jail rolü ayarlanmamış.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Kullanıcının jail rolü var mı kontrol et
    if (!targetMember.roles.cache.has(jailRoleId)) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Bu kullanıcı jail\'de değil.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    await interaction.deferReply();

    // DB'ye kaydet
    await getOrCreateGuild(guild);

    // Moderasyon işlemini Policy üzerinden başlat
    const result = await PolicyService.execute(
      {
        guild,
        member,
        target: targetMember,
        client,
        interaction,
      },
      'UNJAIL',
      { reason },
    );

    if (!result.success) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      });
      return;
    }

    // Embed oluştur
    const embed = CyberEmbed.success('Jail Kaldırıldı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setDefaultFooter()
      .setTimestampNow();

    await interaction.editReply({ embeds: [embed] });
  },
} satisfies SlashCommand;
