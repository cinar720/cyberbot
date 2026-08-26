# CyberBOT - Discord Bot Projesi Durum Özeti

## Proje Genel Bilgi
- **Bot:** CyberBOT - Premium Discord Moderasyon Botu
- **Dil:** TypeScript (ESM)
- **Runtime:** Node.js 22+
- **Discord.js:** 14.27.0 (Components V2 destekli)
- **Veritabanı:** PostgreSQL + Prisma 7.9.1
- **Web Panel:** Express 5.2.1
- **Tunnel:** Cloudflare Tunnel -> https://cyberbot.net.tr
- **Çalışma dizini:** C:\Users\fsaka\Desktop\CyberBOT

## Proje Yapısı
```
src/
├── commands/
│   ├── utility/     (27 komut: help, panel, setup, ticket, premium, vs.)
│   ├── moderation/  (38 komut: ban, kick, mute, warn, jail, guard, automod, vs.)
│   ├── message/     (10 komut: say, embed, clear, pin, vs.)
│   ├── member/      (15 komut: userinfo, avatar, roles, voice, vs.)
│   ├── information/ (16 komut: serverinfo, uptime, vs.)
│   └── developer/   (4 komut: reload, premium-al/ver)
├── events/
├── services/
├── utils/
├── config/
└── web/
```

## Components V2 Durumu

### /help (TAMAMLANDI - Components V2)
- `ContainerBuilder` + `TextDisplayBuilder` + `SeparatorBuilder` kullanıyor
- Dropdown container içinde
- Butonlar container içinde
- Global handler: `handleHelpComponent()` fonksiyonu
- customId yapısı: `cyberbot:help:category:{userId}`
- Collector yok, interaction handler üzerinden çalışıyor
- Kullanıcı doğrulaması: customId'deki userId ile eşleşme

### /panel (TAMAMLANDI - Components V2)
- `ContainerBuilder` + `TextDisplayBuilder` + `SeparatorBuilder` kullanıyor
- Select menu: `cyberbot:panel:select`
- BUT: Select menu handler'ı eksik

### /setup (KLASIK - Embed + Collector)
- `EmbedBuilder` + `ActionRowBuilder<ButtonBuilder>` kullanıyor
- Collector: 60 saniye timeout, max 1 tıklama
- Timeout temizliği: component kaldır + timeout embed göster

### /setup-apply (KLASIK - Embed + Collector)
- `EmbedBuilder` + `ActionRowBuilder<ButtonBuilder>` kullanıyor
- Collector: 30 saniye timeout, max 1 tıklama
- Timeout temizliği: component kaldır + timeout embed göster

### /cases (KLASIK - Embed + Collector)
- `EmbedBuilder` + raw component objects kullanıyor
- Collector: 60 saniye timeout, max yok (süresiz tıklama)
- BUT: Button customId'leri generic ('prev'/'next') - kullanıcılara özel değil, çakışma riski

## Mevcut Sorunlar

### 1. /panel Select Menu Handler Eksik
- Select menu oluşturulmuş ama seçildiğinde ne olacağı tanımlanmamış
- `interactionCreate.ts`'de `cyberbot:panel:select` için handler yok

### 2. /cases Button ID Çakışması
- Button customId'leri `'prev'` ve `'next'` - tüm kullanıcılar aynı ID'leri görüyor
- Farklı kullanıcılar aynı anda cases sayfası açarsa butonlar çakışır
- customId'ye userId eklenmeli: `cyberbot:cases:prev:{userId}:{page}`

### 3. /setup ve /setup-apply Collector Timeout
- Her iki komut da 30-60 saniye sonra component'leri kaldırıyor
- Kullanıcı süre içinde Onay/İptal'e basmazsa menü kayboluyor
- Bu kasıtlı davranış olabilir ama kullanıcı deneyimi için uzatılabilir

### 4. Unicode Emoji Kullanımı
- Eski kodda bazı yerlerde Unicode emoji olabilir
- Components V2'de emoji kullanımı kontrol edilmeli

## Handler Sistemi
- `src/events/interactionCreate.ts` tüm interaction'ları yönlendiriyor
- Command handler: `interaction.isChatInputCommand()` -> komut çalıştırma
- Button handler: `interaction.isButton()` -> customId prefix kontrolü
- Select menu handler: `interaction.isAnySelectMenu()` -> customId prefix kontrolü
- Prefix yapısı: `cyberbot:{module}:{action}:{...params}`

## Veritabanı Modelleri (Prisma)
- User, Guild, Ticket, Warning, Case, Blacklist, Appeal
- Premium: premiumUntil, isPremium
- AutoMod: AutoModConfig, ViolationRule
- Guard: GuardConfig
- Log: LogChannel
- Welcome/Leave: WelcomeConfig, LeaveConfig
- CustomCommand, AutoResponse

## Yapılabilecek İyileştirmeler
1. /panel select menu handler'ı ekle
2. /cases buton ID'lerini kullanıcıya özel yap
3. /setup ve /setup-apply timeout sürelerini gözden geçir
4. Components V2 olmayan komutları Components V2'ye geçir (öncelik: /panel, /setup)
5. Tüm customId'leri standart prefix yapısına geçir
6. Hata yakalama ve errorReporter entegrasyonunu test et
7. Web paneli placeholder sayfalarını gerçek API'ye bağla
8. Otomatik başlatma görevlerini yeniden yapılandır

## Test Komutları
```bash
npx tsc --noEmit          # TypeScript derleme kontrolü
npm run build              # Production build
npm run dev                # Development modu
```

## Notlar
- Discord global komut limiti: 100 (şu an 100 aktif komut var)
- /clear ve /serverfeatures devre dışı bırakıldı (tekrar eden)
- npm run lint çalışmıyor (typescript-eslint TypeScript 7.0.2 uyumsuzluğu)
- Gerçek Discord interaction testleri sınırlı yapıldı
