import { SlashCommandBuilder, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { emojis } from '../../config/emojis.js';
import { main } from '../../config/main.js';
import { PremiumService } from '../../services/premium/PremiumService.js';
import { DurationService } from '../../services/moderation/DurationService.js';
import type { SlashCommand, CommandContext } from '../../types/command.js';

export default {
  metadata: {
    name: 'premium-ver-sureli',
    description: 'Bir kullanıcıya süreli premium verir.',
    category: 'developer',
    cooldown: 5,
    ownerOnly: true,
    guildOnly: false,
  },

  data: new SlashCommandBuilder()
    .setName('premium-ver-sureli')
    .setDescription('Bir kullanıcıya süreli premium verir.')
    .addUserOption((option) =>
      option.setName('kullanici').setDescription('Premium verilecek kullanıcı').setRequired(true),
    )
    .addStringOption((option) =>
      option
        .setName('sure')
        .setDescription('Premium süresi (örn: 7d, 30d, 24h)')
        .setRequired(true),
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
    const durationStr = interaction.options.getString('sure', true);

    const duration = DurationService.parse(durationStr);
    if (!duration || duration.isPermanent) {
      await interaction.reply({
        embeds: [CyberEmbed.error('Geçersiz Süre', 'Geçerli bir süre girin. Örnekler: `7d`, `30d`, `24h`, `12h`')],
        flags: [MessageFlags.Ephemeral],
      });
      return;
    }

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    try {
      const premium = await PremiumService.grantTimed(targetUser.id, interaction.user.id, duration.expiresAt!);

      const embed = CyberEmbed.success(`${emojis.crown} Süreli Premium Verildi`)
        .addFields(
          { name: 'Kullanıcı', value: `${targetUser.tag}`, inline: true },
          { name: 'Veren', value: `${interaction.user.tag}`, inline: true },
          { name: 'Süre', value: duration.text, inline: true },
          { name: 'Bitiş', value: `<t:${Math.floor(duration.expiresAt!.getTime() / 1000)}:R>`, inline: true },
          { name: 'Premium ID', value: `\`${premium.id}\``, inline: true },
        )
        .setDefaultFooter()
        .setTimestampNow();

      await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    } catch (error) {
      await (deferred ? interaction.editReply({
        embeds: [CyberEmbed.error('Hata', 'Premium verilirken bir hata oluştu.')],
      }) : interaction.followUp({ ...{
        embeds: [CyberEmbed.error('Hata', 'Premium verilirken bir hata oluştu.')],
      }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
    }
  },
} satisfies SlashCommand;
