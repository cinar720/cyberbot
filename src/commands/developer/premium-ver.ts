import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import { main } from '../../config/main.js';
import { PremiumService } from '../../services/premium/PremiumService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'premium-ver',
    description: 'Bir kullanıcıya kalıcı premium verir.',
    category: 'developer',
    cooldown: 5,
    ownerOnly: true,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('premium-ver')
    .setDescription('Bir kullanıcıya kalıcı premium verir.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Premium verilecek kullanıcı').setRequired(true),
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

      if (existing && existing.active && existing.expiresAt === null) {
        await interaction.editReply({
          embeds: [CyberEmbed.warning('Zaten Premium', `Bu kullanıcı zaten kalıcı premium sahibi.\nPremium ID: \`${existing.id}\``)],
        });
        return;
      }

      const premium = await PremiumService.grantPermanent(targetUser.id, interaction.user.id);

      const embed = CyberEmbed.success(`${emojis.crown} Premium Verildi`)
        .addFields(
          { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
          { name: 'Veren', value: `${interaction.user.tag}`, inline: true },
          { name: 'Süre', value: 'Kalıcı', inline: true },
          { name: 'Premium ID', value: `\`${premium.id}\``, inline: true },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      await interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Premium verilirken bir hata oluştu.')],
      });
    }
  },
} satisfies SlashCommand;
