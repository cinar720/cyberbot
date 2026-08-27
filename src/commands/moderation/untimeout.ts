import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'untimeout',
    description: 'Kullanıcının timeout\'unu kaldırır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('untimeout')
    .setDescription('Kullanıcının timeout\'unu kaldırır.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Timeout\'u kaldırılacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Sebep').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

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

    // Timeout kontrolü
    if (!targetMember.isCommunicationDisabled()) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Bu kullanıcının timeout\'u bulunmuyor.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

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
      'UNTIMEOUT',
      { reason },
    );

    if (!result.success) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    // Embed oluştur
    const embed = CyberEmbed.success('Timeout Kaldırıldı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setThumbnail(targetUser.displayAvatarURL())
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
