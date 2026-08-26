import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import { main } from '../../config/main.js';
import { PremiumService } from '../../services/premium/PremiumService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'premium-al',
    description: 'Bir kullanıcının premium\'unu kaldırır.',
    category: 'developer',
    cooldown: 5,
    ownerOnly: true,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('premium-al')
    .setDescription('Bir kullanıcının premium\'unu kaldırır.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Premium\'u kaldırılacak kullanıcı').setRequired(true),
    ),

  async execute({ interaction }: CommandContext) {
    if (!main.ownerId || interaction.user.id !== main.ownerId) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Yetki Hatası', 'Bu komut sadece bot sahibi tarafından kullanılabilir.')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    const targetUser = interaction.options.getUser('kullanici', true);

    await interaction.deferReply();

    try {
      const existing = await PremiumService.getPremium(targetUser.id);

      if (!existing) {
        await interaction.editReply({
          embeds: [CyberEmbed.warning('Premium Bulunamadı', `Bu kullanıcının premium kaydı bulunmuyor.\nKullanıcı: ${targetUser.tag}`)],
        });
        return;
      }

      if (!existing.active) {
        await interaction.editReply({
          embeds: [CyberEmbed.warning('Zaten Pasif', `Bu kullanıcının premium'u zaten pasif.\nPremium ID: \`${existing.id}\``)],
        });
        return;
      }

      const revoked = await PremiumService.revokePremium(targetUser.id);

      if (revoked) {
        const embed = CyberEmbed.success(`${emojis.cross} Premium Kaldırıldı`)
          .addFields(
            { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
            { name: 'Kaldıran', value: `${interaction.user.tag}`, inline: true },
            { name: 'Premium ID', value: `\`${existing.id}\``, inline: true },
          )
          .setDefaultFooter()
          .setTimestampNow();

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply({
          embeds: [CyberEmbed.error('Hata', 'Premium kaldırılırken bir hata oluştu.')],
        });
      }
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Premium kaldırılırken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;
