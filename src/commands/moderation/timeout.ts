import { SlashCommandBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { PolicyService } from '../../services/policy/PolicyService.js';
import { CaseService } from '../../services/moderation/CaseService.js';
import { DurationService } from '../../services/moderation/DurationService.js';
import { getOrCreateGuild } from '../../services/database/index.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'timeout',
    description: 'Bir kullanıcıya geçici Discord timeout cezası uygular.',
    category: 'moderation',
    cooldown: 5,
    permissions: [PermissionFlagsBits.ModerateMembers],
    botPermissions: [PermissionFlagsBits.ModerateMembers],
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('timeout')
    .setDescription('Bir kullanıcıya geçici Discord timeout cezası uygular.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Timeout uygulanacak kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sure')
        .setDescription('Timeout süresi (örn: 10m, 1h, 1d, 7d)')
        .setRequired(true),
    )
    .addStringOption((option) =>
      option.setName('sebep').setDescription('Timeout sebebi').setRequired(false),
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),

  async execute({ interaction, member, guild, client }: CommandContext) {
    if (!guild || !member) return;

    const targetUser = interaction.options.getUser('kullanici', true);
    const durationStr = interaction.options.getString('sure', true);
    const reason = interaction.options.getString('sebep') || 'Sebep belirtilmedi.';

    // Süre doğrulama
    const durationCheck = DurationService.validateDuration(durationStr);
    if (!durationCheck.valid) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', durationCheck.error!)],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    // Discord timeout limit kontrolü (28 gün)
    const durationResult = DurationService.parse(durationStr);
    if (durationResult && !durationResult.isPermanent) {
      const maxDuration = DurationService.getMaximumDuration();
      if (durationResult.milliseconds > maxDuration) {
        await interaction.reply({
          embeds: [
            CyberEmbed.error(
              'Hata',
              'Timeout süresi 28 günü aşamaz. Maksimum süre: `28d`',
            ),
          ],
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

    // Bot kontrolü
    if (targetUser.bot) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Hata', 'Botlara timeout uygulanamaz.')],
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
      'TIMEOUT',
      {
        reason,
        duration: durationStr,
      },
    );

    if (!result.success) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', result.error || 'İşlem başarısız.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
      return;
    }

    // Süre bilgisini al
    const duration = DurationService.parse(durationStr);

    // Embed oluştur
    const embed = CyberEmbed.success('Timeout Uygulandı')
      .addFields(
        { name: 'Case', value: result.caseNumber ? CaseService.formatCaseNumber(result.caseNumber) : 'N/A', inline: true },
        { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
        { name: 'Süre', value: duration?.text || durationStr, inline: true },
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

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
