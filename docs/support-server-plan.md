# CyberBOT Support Sunucusu — Araştırma ve Planlama Raporu

---

## A — Araştırma Özeti

Araştırdığım kaynaklar ve bulgular:

**1. Memvers.com — Profesyonel Sunucu Kurulum Rehberi (2026)**
- İyi bir sunucu 4-5 kategoride 8-15 kanal içermeli
- 40 kanallık kalabalık sunucular üyeler kaybettirir
- Doğru yapı: INFO → COMMUNITY → TOPIC → VOICE → STAFF sıralaması

**2. PhantomBot Blog — Kanal ve Kategori İsimlendirme Rehberi**
- Emoji prefixleri 15+ kanal dopoünce faydalı oluyor
- Kategori isimleri BÜYÜK HARF ile yazılmalı
- Staff kanalları en alta yerleştirilmeli
- Her kategoride 5-8 kanal ideal

**3. Conferbot — Topluluk Yönetimi (2026)**
- Ticket sistemi: Kullanıcı buton/seçim menüsü → form → özel kanal → çözüm → transcript
- Bot reply süresi: otomatik ortalama 1sn, insan 15-60dk
- Destek senaryoları: FAQ bot, bug report form, hesap sorunu → ticket

**4. TicketBot/TicketTool — Ticket Sistemleri**
- Foruma tabanlı ticket sistemi çok popüler (temiz kanal listesi)
- Ücretsiz tier: Sınırsız ticket, 3 panel, form, transcript
- Premium: Analitik, otomatik kapatma, özel renk, dashboard
- Oylama ile 24sn premium kazanma sistemi trend

**5. Discord Developing Server Rules (Resmi)**
- Kurallar Discord ToS ile uyumlu olmalı
- Discriminatory dil yasak
- NSFW sadece age-gated kanallarda
- Reklam için moderator onayı şart

**6. Mava.app — Discord Kurallar En İyi Uygulamaları (2026)**
- 5-10 kural ideal (çok fazla kural üyeleri bunaltıyor)
- Net, uygulanabilir, moderatörlerin洁elleyebileceği dil
- Düzenli güncelleme gerekiyor
- Kademeli yaptırım: uyarı → mute → kick → ban

**7. Discordify — Türkçe Sunucu Kuralları Şablonları**
- Türkçe dilbilgisi kurallarına dikkat
- Kısa ve net cümleler
- Her kural için örnek davranış

**8. Top.gg — Türkçe Bot Topluluğu**
- Türkçe botlar: moderation, economy, level, ticket
- Voting sistemi çok yaygın (top.gg üzerinden)
- Premium oylama ile kazanılıyor

---

## B — CyberBOT Support Sunucusu Yapısı

### Kategori ve Kanal Mimarisi

```
═══ BİLGİLENDİRME ═══
📌│kurallar
📢│duyurular
📋│changelog
🤖│bot-durumu

═══ DESTEK ═══
🎫│destek
🐛│bug-report
💡│oneriler
❓│sss

═══ TOPLULUK ═══
💬│genel-sohbet
🖼│medya
🎮│bot-komutları

═══ SES ═══
🔊 Genel
🔊 Sohbet
🔇 AFK

═══ YÖNETİM ═══
🔒│mod-chat
📋│mod-log
📋│sistem-log
```

### Kanal Gerekçeleri

| Kategori | Kanal | Neden Gerekli |
|---|---|---|
| BİLGİLENDİRME | kurallar | İlk kural kanalı, okunabilir, sabitlenmeli |
| BİLGİLENDİRME | duyurular | Bot güncellemeleri, maintenance, önemli haberler |
| BİLGİLENDİRME | changelog | Her versiyon değişikliğinde ne eklendiği/düzeltiliği |
| BİLGİLENDİRME | bot-durumu | CyberBOT'un otomatik status mesajı |
| DESTEK | destek | Ticket paneli, `/ticket-panel` komutu buraya |
| DESTEK | bug-report | Hata raporlama için özel form |
| DESTEK | oneriler | Öneri/sistem istekleri |
| DESTEK | sss | Sıkça sorulan sorular, bot kullanımı |
| TOPLULUK | genel-sohbet | Serbest sohbet |
| TOPLULUK | medya | Ekran görüntüsü, meme, paylaşım |
| TOPLULUK | bot-komutları | Bot komutlarının çalıştırıldığı kanal |
| SES | Genel | Genel ses sohbeti |
| SES | Sohbet | Rahat sohbet |
| SES | AFK | AFK kanalı |
| YÖNETİM | mod-chat | Yetkili ekibi iç iletişim (görünmez) |
| YÖNETİM | mod-log | Moderasyon logları (görünmez) |
| YÖNETİM | sistem-log | Sistem logları, hatalar (görünmez) |

**Toplam:** 17 kanal, 5 kategori — temiz ve yönetilebilir.

---

## C — Mevcut Roller ve Kullanım Amaçları

| Rol | Amaç |
|---|---|
| Owner | Sunucu sahibi, tüm yetkilere sahip |
| Co Owner | Ortak sunucu yöneticisi |
| Manager | Genel yönetim, karar alma |
| Head Moderator | Moderasyon ekibi başı |
| Senior Moderator | Deneyimli moderatör |
| Moderator | Aktif moderatör |
| Trial Moderator | Stajyer moderatör |
| Partner | Resmi partnerler |
| Voter | Top.gg'de oy verenler |
| Booster | Sunucu boostlayanlar |
| Member | Normal üye |
| Bot | Bot rolleri |

**Kullanım notları:**
- Ticket sisteminde: Head Moderator / Senior Moderator = ticket sahibi
- Mod-log sadece Moderator+ rollerine görünür
- Voter rolü, oylama sistemi ile otomatik verilir/silinir
- Premium kullanıcıları için özel rozet eklenebilir (gelecek aşama)

---

## D — CyberBOT'un Kendi Sistemleri (Uzun Vadede)

CyberBOT resmi support sunucusunda kendi sistemlerini kullanmalı:

### 1. Ticket Sistemi
- Web panel üzerinden tam yapılandırma
- Discord'da `/ticket-panel` ile Components V2 panel
- Kategoriler: Genel Destek, Bug Report, Premium, Partnerlik
- Transcript, claim, otomatik kapatma

### 2. Moderasyon
- Warn, timeout, kick, ban
- AutoMod (spam, link, mention koruması)
- Audit logging

### 3. Log Sistemi
- Moderation logs
- Member join/leave
- Message logs (silinen/düzeltilen)
- Voice logs
- Ticket logs
- System/error logs

### 4. Voting Sistemi
- Top.gg üzerinden oylama
- Voter rolü otomatik verme
- Oylama logları

### 5. Premium Sistemi
- Sunucu premium + Kullanıcı premium
- Web panel üzerinden yönetim
- Premium rozeti

### 6. Changelog
- Her versiyon güncellemesinde otomatik posting
- Web panel changelog yönetimi

### 7. Bot Status
- Otomatik status mesajı
- API ping, uptime, guild sayısı

### 8. Anti-Spam / Anti-Raid
- Mesaj spam koruması
- Raid algılama
- Join flood koruması

---

## E — Ticket Sistemi Mimarisi

### Discord Tarafı
- `/ticket-panel` komutu → Components V2 embed
- Panel içinde: Container, TextDisplay, Separator, Button, StringSelectMenu
- Kategoriler: Genel Destek, Hata Raporu, Premium Destek, Partnerlik
- Her kategori için farklı yetkili rolü

### Web Panel Tarafı
- Ticket kategorileri yönetimi
- Panel açıklaması/düzenleme
- Yetkili rol atama
- Transcript görüntüleme
- Otomatik mesajlar
- SLA takibi (gelecek)

### Akış
1. Kullanıcı `/ticket-panel` kanalında kategori seçer
2. Form açılır (sorun detayı, ekran görüntüsü vb.)
3. Özel kanal oluşturulur
4. Yetkili moderatör tarafından cevaplanır
5. Çözüldüğünde transcript kaydedilir ve kanal silinir

---

## F — Slash + Prefix Mimarisi

### Yaklaşım
- Tüm komutlar slash command olarak başlayacak
- Prefix command opsiyonel destek (gelecek)
- İş mantığı ortak servis katmanında

### Kategoriler
- **Moderasyon:** /ban, /kick, /warn, /timeout, /jail
- **Üye:** /userinfo, /avatar, /role
- **Yönetim:** /setup, /panel, /config
- **Destek:** /ticket-panel, /ticket-close
- **Eğlence:** /seviye, /liderlik-tablosu
- **Bilgi:** /botinfo, /serverinfo, /help

### Öncelik
- Önce slash commands
- Prefix sadece gerçekten gerekirse
- Web panel ana yönetim merkezi

---

## G — Premium Yaklaşımı

### İki Model
1. **Sunucu Premium:** Bir Discord sunucuna bağlı
2. **Kullanıcı Premium:** Bir kullanıcıya bağlı

### Kontrol Mekanizması
- Backend tarafında Zod validasyon + DB kontrolü
- Frontend'de premium gösterimi serbest
- Premium olmayan kullanıcı erişmeye çalıştığında 403
- Frontend bu durumu "Premium yükselt" ekranına çevirir

### Premium Özellikler (Örnek)
- Gelişmiş AutoMod
- Özel roller
- Ek ticket kategorileri
- Gelişmiş loglar
- Öncelikli destek

---

## H — Moderasyon ve Güvenlik

### Gerekli Sistemler

| Sistem | Gerekli mi? | Neden |
|---|---|---|
| Warn | Evet | İlk uyarı için |
| Timeout | Evet | Kısa süreli susturma |
| Kick | Evet | Geçici uzaklaştırma |
| Ban | Evet | Kalıcı uzaklaştırma |
| AutoMod | Evet | Spam, link, mention koruması |
| Anti-Raid | Evet | Join flood koruması |
| Audit Log | Evet | Moderasyon takibi |
| Message Mod | Hayır | Geliştirme aşamasında |
| Link Protection | Evet | Zararlı link engelleme |
| Mention Spam | Evet | Mention spam koruması |

### Kademeli Yaptırım
- **Seviye 1:** Uyarı (sözlü/yazılı)
- **Seviye 2:** Timeout (1-24 saat)
- **Seviye 3:** Kick
- **Seviye 4:** Ban
- **Ağır ihlaller:** Doğrudan ban (NSFW, doxxing, raid)

---

## I — Log Sistemleri

### Gerekli Loglar

| Log Türü | Kanal | İçerik |
|---|---|---|
| Moderation | mod-log | Warn, timeout, kick, ban işlemleri |
| Member | mod-log | Join/leave olayları |
| Message | mod-log | Silinen/düzeltilen mesajlar |
| Ticket | mod-log | Ticket açma/kapama/transcript |
| System | sistem-log | Bot başlama/kapanma, hatalar |
| Vote | mod-log | Top.gg oylama logları |

### Spam Koruması
- Her log türü için minimum 1sn bekleme
- Aynı olay tekrar ediyorsa birleştir
- Log gönderimi başarısızsa botu bozma
- Mod-log sadece Moderator+ görünür

---

## J — CyberBOT Support Sunucusu Kuralları

Aşağıdaki metin doğrudan `#kurallar` kanalına koyulabilir:

---

### 📌 CyberBOT Support Sunucusu Kuralları

Bu sunucuda bulunan herkes aşağıdaki kurallara uymakla yükümlüdür. Kurallar tüm kanalları, sesli ve yazılı iletişimi kapsar. Kuralları okumadan sunucuya katılım sağlamanız, kuralları kabul ettiğiniz anlamına gelir.

---

#### 1. Saygı ve Davranış

**1.1.** Sunucudaki herkese saygılı olun. Irk, dil, din, cinsiyet, cinsel yönelim, milliyet veya engellilik temelli hakaret, aşağılama ve ayrımcılık kesinlikle yasaktır.

**1.2.** Taciz, zorbalık, psikolojik baskı veya kişiye yönelik sürekli olumsuz davranışlar yasaktır. Bir kişi size "dur" dediğinde saygı gösterin.

**1.3.** Kişisel bilgilerinizi (adres, telefon, okul vb.) paylaşmayın. Başkalarının kişisel bilgilerini izinleri olmadan paylaşmak (doxxing) sunucudan kalıcı olarak uzaklaştırılma sebebidir.

**1.4.** Yetkili kişilerin kararlarına saygılı olun. Kararlara itiraz etmek için doğru kanalları kullanın, tartışmayı kamuoyu önünde yapmayın.

---

#### 2. Mesajlaşma ve İletişim

**2.1.** Spam, flood, aynı mesajın tekrar tekrar gönderilmesi veyaanoia yaratacak davranışlar yasaktır. Emoji duplicated Nadu}Emoji aggressively spamming for multiple messages is also not allowed.

**2.2.** Tüm mesajlarınızı Türkçe yazın. Destek almak istediğinizde sorununuzu net ve anlaşılır bir şekilde ifade edin.

**2.3.** Hakaret, küfür, cinsel içerikli veya rahatsız edici dil kullanımı yasaktır. Temiz bir dil kullanın.

**2.4.** sesli kanallarda mikrofon spamı, yüksek ses, müzik broadcast'i veya rahatsız edici davranışlar yasaktır.

---

#### 3. Kanal Kullanımı

**3.1.** Her kanalın belirli bir amacı vardır. Konuları ilgili kanallarda tartışın.

**3.2.** `#destek` kanalını sadece CyberBOT ile ilgili sorularınız için kullanın. Genel sohbet için `#genel-sohbet` kanalını tercih edin.

**3.3.** `#bug-report` kanalında sadece hata raporları paylaşın. Hata raporunda sorununuzu detaylı açıklayın.

**3.4.** `#oneriler` kanalında sadece CyberBOT ile ilgili önerilerinizi paylaşın.

**3.5.** Duyuru kanallarında (duyurular, changelog) sadece yetkili kişiler mesaj gönderebilir.

---

#### 4. Reklam ve Tanıtım

**4.1.** Sunucuda izinsiz reklam yapmak yasaktır. Bu, diğer Discord sunucuları, botlar, web siteleri veya ürünleri kapsar.

**4.2.** CyberBOT yerine başka bir botu tanıtmak, tavsiye etmek veya davet linkini paylaşmak kesinlikle yasaktır.

**4.3.** Kendi sunucunuzda başka botlar kullanmanız serbesttir. Bu kural sadece CyberBOT Support sunucusu için geçerlidir.

**4.4.** Partnerlik talepleri için `#destek` kanalını veya ticket sistemini kullanın. DM'den partnerlik teklif etmeyin.

---

#### 5. Güvenlik

**5.1.** Zararlı bağlantılar, phishing linkleri veya virüs içeren dosyalar paylaşmak kesinlikle yasaktır ve anında ban sebebidir.

**5.2.** NSFW (uygunsuz) içerik paylaşmak yasaktır. Sunucuda NSFW kanal bulunmamaktadır.

**5.3.** CyberBOT'un token, API anahtarı veya diğer gizli bilgilerini paylaşmaya çalışmak yasaktır.

**5.4.** Sunucuya yönelik raid, DDoS veya herhangi bir saldırıyı organize etmek veya katılmak yasaktır.

---

#### 6. Hesaplar ve Kimlik

**6.1.** Alternatif hesaplarla yaptırımları aşmaya çalışmak yasaktır. Ban yiyen bir hesapla yeniden giriş yapmak kalıcı ban sebebidir.

**6.2.** Sahte hesaplarla sunucuya katılmak yasaktır.

**6.3.** Başka bir kişinin kimliğine bürünmek veya yetkili taklidi yapmak yasaktır.

---

#### 7. Ticket ve Destek

**7.1.** Ticket sistemi sadece gerçekten yardıma ihtiyacınız olduğunda kullanın. Gereksiz ticket açmak moderasyon ekibinin işini zorlaştırır.

**7.2.** Bir ticket'ta çözüme ulaştığınızda kendi tarafınızdan kapatın. Kapatmayan ticket'lar otomatik olarak kapatılabilir.

**7.3.** Ticket içeriğinde hassas bilgi (şifre, kart bilgisi vb.) paylaşmayın.

**7.4.** Destek ekibine saygılı olun. Sabırlı olun ve sorununuzu net açıklayın.

---

#### 8. Voting ve Premium

**8.1.** Top.gg üzerinden CyberBOT'a oy vermek zorunlu değildir, ancak oy vermek premium özelliklere erişim sağlayabilir.

**8.2.** Oylama manipülasyonu veya sahte oylama yapmak yasaktır.

**8.3.** Premium özellikleri premium olmayan kullanıcılarla paylaşmak veya devretmek teknik olarak mümkün değildir ve bypass etmeye çalışmak yasaktır.

---

#### 9. Moderasyon Kararları

**9.1.** Moderasyon ekibi uyguladığı yaptırımlar konunda nihai karar yetkisine sahiptir.

**9.2.** Yaptırımlara itiraz etmek için `#destek` kanalında ticket açın. Kamuoyu tartışması yapılmaz.

**9.3.** Moderasyon kararlarını atlatmaya çalışmak (yeniden hesap açma, DM'den rahatsız etme vb.) ek yaptırım sebebidir.

---

#### 10. Discord Kuralları

**10.1.** Bu sunucudaki tüm faaliyetler Discord'un [Topluluk Kuralları](https://discord.com/guidelines) ve [Hizmet Şartları](https://discord.com/terms) ile uyumlu olmalıdır.

**10.2.** Discord'un yasakladığı herhangi bir davranış bu sunucuda da yasaktır.

---

### Yaptırımlar

Kurallara uymayan成员lara aşağıdaki yaptırımlar uygulanabilir:

- **Uyarı:** İlk ihlaller için sözlü veya yazılı uyarı
- **Timeout:** Geçici susturma (1 saat - 7 gün arası)
- **Kick:** Sunucudan atılma (yeniden katılabilir)
- **Ban:** Kalıcı uzaklaştırma

Her ihlal için otomatik olarak aynı ceza uygulanmaz. İhlalin ağırlığı, tekrarı, etkisi ve kullanıcının geçmiş davranışları değerlendirilir. Ağır ihlallerde (NSFW, doxxing, raid, zararlı link) doğrudan ban uygulanabilir.

---

### İtiraz

Yaptırıma itiraz etmek için `#destek` kanalında ticket açın. İtirazınız değerlendirilecek ve size geri dönüş yapılacaktır.

---

*Bu kurallar CyberBOT ekibi tarafından düzenlenir ve güncellenir. Kurallarda yapılacak değişiklikler `#duyurular` kanalından paylaşılacaktır.*

---

*Rapor tarihi: Ağustos 2026*
