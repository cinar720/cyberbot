import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import { colors } from '../../config/colors.js';
import { main } from '../../config/main.js';
import { PremiumService } from '../../services/premium/PremiumService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'premium',
    description: 'Premium durumunuzu gösterir.',
    category: 'utility',
    cooldown: 5,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('premium')
    .setDescription('Premium durumunuzu gösterir.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Sorgulanacak kullanıcı (sadece bot sahibi)').setRequired(false),
    ),

  async execute({ interaction }: CommandContext) {
    let deferred = false;

    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    try {
      const isOwner = main.ownerId && interaction.user.id === main.ownerId;
      const targetUser = isOwner
        ? interaction.options.getUser('kullanici') || interaction.user
        : interaction.user;

      const result = await PremiumService.getPremiumSafe(targetUser.id);

      if (result.status === 'error') {
        await (deferred ? interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Premium bilgisi şu anda kontrol edilemiyor. Lütfen daha sonra tekrar deneyin.')],
        }) : interaction.followUp({ ...{
          embeds: [CyberEmbed.error('Hata', 'Premium bilgisi şu anda kontrol edilemiyor. Lütfen daha sonra tekrar deneyin.')],
        }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      if (result.status === 'not_found') {
        const embed = CyberEmbed.info(`${emojis.crown} Premium durumu`)
          .setDescription(`${targetUser.tag} kullanıcısının **Premium**'u bulunmuyor.`)
          .addFields(
            { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: 'Durum', value: 'Premium yok', inline: true },
          )
          .setColor(colors.warning)
          .setDefaultFooter()
          .setTimestampNow();

        await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
        return;
      }

      const premium = result.data;
      const isExpired = PremiumService.isExpired(premium);
      const remaining = PremiumService.getRemainingTime(premium);
      const isPermanent = premium.expiresAt === null;

      const statusIcon = isExpired ? 'Süresi Dolmuş' : 'Aktif';
      const statusColor = isExpired ? colors.error : colors.success;

      const embed = CyberEmbed.info(`${emojis.crown} Premium durumu`)
        .addFields(
          { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
          { name: 'Durum', value: statusIcon, inline: true },
          { name: 'Tür', value: isPermanent ? 'Kalıcı' : 'Süreli', inline: true },
        )
        .setColor(statusColor)
        .setDefaultFooter()
        .setTimestampNow();

      if (!isPermanent && premium.expiresAt) {
        embed.addFields({
          name: 'Bitiş tarihi',
          value: `<t:${Math.floor(premium.expiresAt.getTime() / 1000)}:R>`,
          inline: true,
        });
      }

      if (remaining) {
        embed.addFields({
          name: 'Kalan süre',
          value: remaining,
          inline: true,
        });
      }

      embed.addFields(
        { name: 'Veren', value: `<@${premium.grantedBy}>`, inline: true },
        { name: 'Premium ID', value: `\`${premium.id}\``, inline: true },
      );

      await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    } catch (error) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Premium durumu kontrol edilirken bir hata oluştu.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Premium durumu kontrol edilirken bir hata oluştu.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    }
  },
} satisfies SlashCommand;
