import { SlashCommandBuilder, Guild, MessageFlags } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import { formatNumber } from '../../utils/helpers.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serverinfo',
    description: 'Sunucu hakkında bilgi verir.',
    category: 'information',
    cooldown: 5,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serverinfo')
    .setDescription('Sunucu hakkında bilgi verir.'),

  async execute({ interaction, guild }) {
    if (!guild) return;

    let deferred = false;


    try { await interaction.deferReply(); deferred = true; } catch { /* interaction already acknowledged */ }

    const g = guild as Guild;

    const textChannels = g.channels.cache.filter((c) => c.type === 0).size;
    const voiceChannels = g.channels.cache.filter((c) => c.type === 2).size;
    const categories = g.channels.cache.filter((c) => c.type === 4).size;
    const roles = g.roles.cache.size - 1;
    const emojis = g.emojis.cache.size;
    const boostCount = g.premiumSubscriptionCount || 0;
    const boostLevel = g.premiumTier;

    const embed = CyberEmbed.info(`${g.name} Sunucu Bilgisi`)
      .setThumbnail(g.iconURL() ?? null)
      .addFields(
        { name: 'Genel', value: [
          `ID: \`${g.id}\``,
          `Sahip: <@${g.ownerId}>`,
          `Oluşturulma: <t:${Math.floor(g.createdTimestamp / 1000)}:R>`,
        ].join('\n'), inline: true },
        { name: 'Üyeler', value: [
          `Toplam: \`${formatNumber(g.memberCount)}\``,
          `İnsan: \`${formatNumber(g.members.cache.filter((m) => !m.user.bot).size)}\``,
          `Bot: \`${formatNumber(g.members.cache.filter((m) => m.user.bot).size)}\``,
        ].join('\n'), inline: true },
        { name: 'Kanallar', value: [
          `Metin: \`${textChannels}\``,
          `Ses: \`${voiceChannels}\``,
          `Kategori: \`${categories}\``,
        ].join('\n'), inline: true },
        { name: 'Diğer', value: [
          `Roller: \`${roles}\``,
          `Emojiler: \`${emojis}\``,
          `Boost: \`${boostCount}\` (Seviye ${boostLevel})`,
        ].join('\n'), inline: true },
        { name: 'Güvenlik', value: [
          `Doğrulama: \`${g.verificationLevel}\``,
          `İçerik Filtresi: \`${g.explicitContentFilter}\``,
        ].join('\n'), inline: true },
      )
      .setDefaultFooter()
      .setTimestampNow();

    if (g.iconURL()) {
      embed.setImage(g.iconURL()!);
    }

    await (deferred ? interaction.editReply({ embeds: [embed] }) : interaction.followUp({ ...{ embeds: [embed] }, flags: [MessageFlags.Ephemeral] }).catch(() => null));
  },
} satisfies SlashCommand;
