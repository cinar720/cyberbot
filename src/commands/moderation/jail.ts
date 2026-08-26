import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { DurationService } from '../../services/moderation/DurationService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'jail',
    description: 'Kullanıcıyı jail sistemine alır.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.BanMembers],
    botPermissions: [PermissionFlagsBits.BanMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('jail')
    .setDescription('Kullanıcıyı jail sistemine alır.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Jail\'e alınacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('sure').setDescription('Süre (örn: 1h, 1d, 7d). Boşsa süresiz.').setRequired(false),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Jail sebebi').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('kullanici', true);
    const durationStr = interaction.options.getString('sure');
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

    // Süre doğrulama (varsa)
    if (durationStr) {
      const durationCheck = DurationService.validateDuration(durationStr);
      if (!durationCheck.valid) {
        await interaction.reply({
          embeds: [CyberEmbed.error('Hata', durationCheck.error!)],
          flags: [MessageFlags.Ephemeral],
        });
        return;
      }
    }

    // Hedef member'ı al
    const targetMember = await guild.members.fetch(targetUser.id).catch(() => null);
    if (!targetMember) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Kullanıcı sunucuda bulunamadı.')],
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
      'JAIL',
      {
        reason,
        duration: durationStr || undefined,
      },
    );

    if (!result.success) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      });
      return;
    }

    // Süre bilgisini al
    const duration = durationStr ? DurationService.parse(durationStr) : null;

    // Embed oluştur
    const embed = CyberEmbed.success('Kullanıcı Jail\'e Alındı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Süre', value: duration?.text || 'Süresiz', inline: true },
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
