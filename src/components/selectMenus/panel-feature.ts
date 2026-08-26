import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ContainerBuilder,
  MessageFlags,
  SeparatorBuilder,
  StringSelectMenuBuilder,
  TextDisplayBuilder,
} from 'discord.js';
import { colors } from '../../config/colors.js';
import { getInviteUrl } from '../../web/auth/oauth2.js';
import { links } from '../../config/links.js';
import type { SelectMenuComponent } from '../../types/command.js';

const featureInfo: Record<string, { title: string; description: string; color: number; fields: Array<{ name: string; value: string; inline?: boolean }> }> = {
  'cyberbot:panel:feature:moderation': {
    title: 'Moderasyon',
    description: 'Sunucunuzu profesyonelce yönetin.',
    color: colors.info,
    fields: [
      { name: 'Ban', value: 'Kullanıcıyı sunucudan kalıcı olarak atar.', inline: true },
      { name: 'Kick', value: 'Kullanıcıyı sunucudan atar.', inline: true },
      { name: 'Mute', value: 'Kullanıcıyı susturur.', inline: true },
      { name: 'Warn', value: 'Kullanıcıya uyarı verir.', inline: true },
      { name: 'Jail', value: 'Kullanıcıyı hapse atar.', inline: true },
      { name: 'Vaka', value: 'Vaka kayıtlarını görüntüler.', inline: true },
    ],
  },
  'cyberbot:panel:feature:guard': {
    title: 'Guard',
    description: 'Sunucunuzu dış tehditlere karşı koruyun.',
    color: colors.error,
    fields: [
      { name: 'Anti-Raid', value: 'Toplu katılım saldırılarını engeller.', inline: true },
      { name: 'Anti-Spam', value: 'Spam mesajları otomatik temizler.', inline: true },
      { name: 'Anti-Nuke', value: 'Sunucu silme/sabotaj saldırılarını önler.', inline: true },
      { name: 'Kanal koruması', value: 'Kanal oluşturma/silme işlemlerini korur.', inline: true },
      { name: 'Rol koruması', value: 'Rol oluşturma/silme/değişiklikleri korur.', inline: true },
      { name: 'Bot Guard', value: 'Bot katılım/senaryo koruması sağlar.', inline: true },
    ],
  },
  'cyberbot:panel:feature:automod': {
    title: 'AutoMod',
    description: 'Otomatik moderasyon kuralları ile sunucunuzu temiz tutun.',
    color: colors.warning,
    fields: [
      { name: 'Kelime filtresi', value: 'İstenmeyen kelimeleri otomatik engeller.', inline: true },
      { name: 'Link filtresi', value: 'İzinsiz linkleri otomatik engeller.', inline: true },
      { name: 'Spam koruması', value: 'Aynı mesajı tekrarlayanları engeller.', inline: true },
      { name: 'Küfür filtresi', value: 'Küfürlü içerikleri otomatik temizler.', inline: true },
      { name: 'Caps lock', value: 'Büyük harf spamını engeller.', inline: true },
      { name: 'Özel yanıt', value: 'Tetikleyici kelimeye otomatik yanıt verir.', inline: true },
    ],
  },
  'cyberbot:panel:feature:ticket': {
    title: 'Ticket',
    description: 'Profesyonel destek talebi sistemi.',
    color: colors.primary,
    fields: [
      { name: 'Ticket oluştur', value: 'Kullanıcılar destek talebi açabilir.', inline: true },
      { name: 'Ticket kapat', value: 'Destek talebini kapatabilirsiniz.', inline: true },
      { name: 'Transkript', value: 'Mesaj kayıtlarını indirebilirsiniz.', inline: true },
      { name: 'Kategori', value: 'Farklı destek kategorileri oluşturun.', inline: true },
      { name: 'Buton sistemi', value: 'Embed üzerinde buton ile ticket açma.', inline: true },
      { name: 'Kayıt', value: 'Ticket işlemlerini takip edin.', inline: true },
    ],
  },
  'cyberbot:panel:feature:logs': {
    title: 'Kayıtlar',
    description: 'Sunucunuzdaki her şeyi takip edin.',
    color: colors.success,
    fields: [
      { name: 'Mesaj kaydı', value: 'Silinen/düzenlenen mesajları kaydeder.', inline: true },
      { name: 'Ses kaydı', value: 'Ses kanalı giriş/çıkış kayıtları.', inline: true },
      { name: 'Kanal kaydı', value: 'Kanal oluşturma/silme/değişiklikler.', inline: true },
      { name: 'Rol kaydı', value: 'Rol atama/kaldırma/değişiklikler.', inline: true },
      { name: 'Moderasyon kaydı', value: 'Ban/kick/mute/warn işlemleri.', inline: true },
      { name: 'Üye kaydı', value: 'Üye katılım/ayrılma kayıtları.', inline: true },
    ],
  },
  'cyberbot:panel:feature:premium': {
    title: 'Premium',
    description: 'CyberBOT Premium ile sınırsız gücü deneyimleyin.',
    color: 0xf59e0b,
    fields: [
      { name: 'Özel komutlar', value: 'Özel komut ve otomatik yanıt.', inline: true },
      { name: 'Geliştirilmiş Guard', value: 'Daha güçlü koruma sistemi.', inline: true },
      { name: 'Detaylı istatistik', value: 'Gelişmiş analiz ve raporlar.', inline: true },
      { name: 'Öncelikli destek', value: 'Hızlı ve öncelikli teknik destek.', inline: true },
      { name: 'Kalıcı lisans', value: 'Sınırlı süre değil, kalıcı erişim.', inline: true },
      { name: 'Premium kanal', value: 'Özel premium kullanıcısı kanalı.', inline: true },
    ],
  },
};

export default {
  id: 'cyberbot:panel:select',

  async execute(interaction) {
    const value = interaction.values[0] ?? '';
    const feature = featureInfo[value];

    if (!feature) {
      await interaction.reply({
        content: 'Geçersiz seçim.',
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const container = new ContainerBuilder().setAccentColor(feature.color);
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(`# CyberBOT\n\n**${feature.title}**`),
      new TextDisplayBuilder().setContent(feature.description),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addTextDisplayComponents(
      new TextDisplayBuilder().setContent(
        feature.fields.map((field) => `**${field.name}:** ${field.value}`).join('\n'),
      ),
    );
    container.addSeparatorComponents(new SeparatorBuilder().setDivider(true));
    container.addActionRowComponents(
      new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(
        new StringSelectMenuBuilder()
          .setCustomId('cyberbot:panel:select')
          .setPlaceholder('Bir özellik seçin')
          .addOptions(
            Object.entries(featureInfo).map(([key, item]) => ({
              label: item.title,
              value: key,
              description: item.description,
            })),
          ),
      ),
    );
    container.addActionRowComponents(
      new ActionRowBuilder<ButtonBuilder>().addComponents(
        new ButtonBuilder().setURL(getInviteUrl()).setLabel('Botu ekle').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setURL(process.env.WEB_URL || links.website).setLabel('Web paneli').setStyle(ButtonStyle.Link),
        new ButtonBuilder().setURL(links.support).setLabel('Destek sunucusu').setStyle(ButtonStyle.Link),
      ),
    );

    await interaction.update({
      components: [container],
    });
  },
} satisfies SelectMenuComponent;
