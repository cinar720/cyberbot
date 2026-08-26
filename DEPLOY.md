# CyberBOT Bulut Deployment Rehberi

## Gereksinimler
- GitHub hesabı
- Railway hesabı (https://railway.app)
- Supabase hesabı (https://supabase.com) - Ücretsiz PostgreSQL

## Adım 1: Supabase Veritabanı Kurulumu

1. https://supabase.com'a git ve hesap oluştur
2. "New Project" tıkla
3. Proje adı: `cyberbot`
4. Şifre belirle (bunu kaydet)
5. Region: `EU West` (Avrupa - en yakın)
6. "Create new project" tıkla
7. Proje açıldıktan sonra "Settings" > "Database" tıkla
8. "Connection string" > "URI" kopyala
9. Bu URI'yi şu formata çevir:
   ```
   postgresql://postgres.[PROJE-ID]:[ŞİFRE]@aws-0-[REGION].pooler.supabase.com:6543/postgres
   ```

## Adım 2: GitHub'a Push

```bash
cd C:\Users\fsaka\Desktop\CyberBOT
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com[KULLANICI-ADIN]/cyberbot.git
git push -u origin main
```

## Adım 3: Railway Kurulumu

1. https://railway.app'e git
2. "Login with GitHub" ile giriş yap
3. "New Project" > "Deploy from GitHub repo"
4. `cyberbot` repo'sunu seç
5. "Add Variables" tıkla
6. Şu değişkenleri ekle:

### Zorunlu Değişkenler
```
TOKEN=Discord bot token'ın
CLIENT_ID=Discord client ID'n
OWNER_ID=Discord kullanıcı ID'n
DATABASE_URL=Supabase connection URI
NODE_ENV=production
```

### Seçenekli Değişkenler
```
BOT_NAME=CyberBOT
BOT_VERSION=1.0.0
WEB_PORT=3000
LOG_LEVEL=info
DISCORD_PUBLIC_KEY=Discord public key
DEVELOPER_IDS=developer1,developer2
ERROR_LOG_CHANNEL_ID=hata kanalı ID
SUPPORT_SERVER_URL=https://discord.gg/cyberbot
WEBSITE_URL=https://cyberbot.net.tr
```

## Adım 4: Veritabanı Migration

Railway'de terminal aç:
1. "Settings" > "Networking" > "Public Networking"
2. "Generate Domain" tıkla (bir URL alacaksın)
3. Terminal'de çalıştır:
```bash
npx prisma migrate deploy
```

## Adım 5: Otomatik Deploy

Railway otomatik olarak her push'ta deploy eder.
- `main` branch'e push yap → otomatik deploy
- Manuel deploy: "Deploy" butonuna bas

## Adım 6: PC ile Eşitleme

### PC Açıkken (Lokal)
PC'de bot zaten çalışıyorsa, Railway'dekini durdur:
```bash
railway service stop
```

### PC Kapalıyken (Bulut)
Railway otomatik olarak çalışır.

### PC Açılınca
1. PC'de botu başlat
2. Railway'dekini durdur:
```bash
railway service stop
```

## Adım 7: Sağlık Kontrolü

Railway health check endpoint'i:
```
https://[PROJE-ADIN].up.railway.app/api/health
```

## Sorun Giderme

### Bot bağlanamıyor
- Token'ın geçerli olduğunu kontrol et
- DATABASE_URL'in doğru formatta olduğunu kontrol et

### Veritabanı hatası
- Supabase'in free tier'da 500MB sınırı var
- Prisma migration'ın çalıştığını kontrol et

### Cold start sorunu
- Railway free tier'da 30 saniye cold start süresi var
- Bu normal

## Maliyet
- **Railway Free Tier:** $5/ay kredi (bot 24/7 çalışabilir)
- **Supabase Free Tier:** 500MB, 50K ayarlama isteği
- **Toplam:** Ücretsiz (başlangıç için)

## İpuçları
- Railway dashboard'dan logları takip edebilirsin
- "Metrics" sekmesinden CPU/RAM kullanımını görebilirsin
- Environment variables'ları buradan düzenleyebilirsin
