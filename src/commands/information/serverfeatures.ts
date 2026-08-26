import { SlashCommandBuilder } from 'discord.js';
import { CyberEmbed } from '../../utils/embed.js';
import type { SlashCommand } from '../../types/command.js';

export default {
  metadata: {
    name: 'serverfeatures',
    description: 'Sunucu özelliklerini gösterir.',
    category: 'information',
    cooldown: 5,
    enabled: false,
    guildOnly: true,
  },

  data: new SlashCommandBuilder()
    .setName('serverfeatures')
    .setDescription('Sunucu özelliklerini gösterir.'),

  async execute({ interaction, guild }) {
    if (!guild) return;

    const features = guild.features;

    const featureNames: Record<string, string> = {
      ANIMATED_BANNER: 'Animasyonlu Banner',
      BANNER: 'Banner',
      COMMERCE: 'Ticaret',
      COMMUNITY: 'Topluluk',
      DISCOVERABLE: 'Keşfedilebilir',
      FEATURABLE: 'Öne Çıkarılabilir',
      GUILD_HOME: 'Sunucu Anasayfası',
      GUILD_ONBOARDING: 'Sunucu Yönlendirmesi',
      GUILD_SERVER_GUIDE: 'Sunucu Rehberi',
      GUILD_WEB_BANNER_WEBP: 'Web Banner (WebP)',
      HUB: 'Topluluk Merkezi',
      INVITE_SPLASH: 'Davet Emoji',
      MEMBER_VERIFICATION_GATE_ENABLED: 'Üye Doğrulama',
      MONETIZATION_ENABLED: 'Para Kazanma',
      MORE_EMOJI: 'Daha Fazla Emoji',
      MORE_STICKERS: 'Daha Fazla Sticker',
      NEWS: 'Duyuru Kanalları',
      NEW_THREAD_PERMISSIONS: 'Yeni Konu İzni',
      PARTNERED: 'Ortak',
      PREVIEW_ENABLED: 'Önizleme Aktif',
          PRIVATE_THREADS: 'Özel Konular',
      ROLE_ICONS: 'Rol İkonları',
      SEVEN_DAY_THREAD_ARCHIVE: '7 Gün Konu Arşivi',
      THREE_DAY_THREAD_ARCHIVE: '3 Gün Konu Arşivi',
      TICKETED_EVENTS_ENABLED: 'Biletli Etkinlikler',
      VANITY_URL: 'Özel Davet URL',
      VERIFIED: 'Doğrulanmış',
      VIP_REGIONS: 'VIP Bölgeler',
    };

    const embed = CyberEmbed.info(`${guild.name} Özellikleri`)
      .setThumbnail(guild.iconURL({ size: 512 }) || '')
      .setDefaultFooter()
      .setTimestampNow();

    if (features.length === 0) {
      embed.setDescription('Bu sunucuda özel bir özellik bulunmuyor.');
    } else {
      const featureList = features
        .map((f) => `\`${featureNames[f] ?? f}\``)
        .join('\n');
      embed.addFields({ name: `Özellikler (${features.length})`, value: featureList, inline: false });
    }

    await interaction.reply({ embeds: [embed] });
  },
} satisfies SlashCommand;
