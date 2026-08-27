import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { getOrCreateGuild, getOrCreateUser } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'unban',
    description: 'Kullanıcının yasağını kaldırır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('unban')
    .setDescription('Kullanıcının yasağını kaldırır.')
    .addStringOption((option) =>
      option.setName('kullanici_id').setDescription('Yasağı kaldırılacak kullanıcının ID\'si').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Sebep').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const userId = interaction.options.getString('kullanici_id', true);
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

    // ID doğrulama
    if (!/^\d{17,20}$/.test(userId)) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Geçersiz kullanıcı ID\'si.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Ban kontrolü
    const ban = await guild.bans.fetch(userId).catch(() => null);
    if (!ban) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Bu kullanıcı yasaklı değil.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    // DB'ye kaydet
    await getOrCreateGuild(guild);
    await getOrCreateUser(ban.user);

    // PolicyService.execute üzerinden çalıştır (bot member'ı target olarak kullan)
    const botMember = await guild.members.fetch(interaction.client.user.id);
    const result = await PolicyService.execute(
      {
        guild,
        member,
        target: botMember,
        client,
        interaction,
      },
      'UNBAN',
      { reason, targetUserId: userId }
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
    const embed = CyberEmbed.success('Yasak Kaldırıldı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kullanıcı', value: `${ban.user.tag}`, inline: true },
        { name: 'Moderatör', value: `${member.user.tag}`, inline: true },
        { name: 'Sebep', value: reason, inline: false },
      )
      .setThumbnail(ban.user.displayAvatarURL())
      .setDefaultFooter()
      .setTimestampNow();

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
