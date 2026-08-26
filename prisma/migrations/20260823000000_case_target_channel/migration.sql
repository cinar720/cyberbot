-- Case target değişikliği: targetId nullable, targetChannelId eklendi
-- Bu migration mevcut verileri KORUYOR, sadece yapı değişikliği yapıyor.

-- 1. targetChannelId sütununu ekle (nullable, tüm mevcut satırlar null olacak)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "targetChannelId" TEXT;

-- 2. targetId'den NOT NULL kısıtlamasını kaldır (mevcut veriler korunur)
-- PostgreSQL'de ALTER COLUMN ile nullable yapma
ALTER TABLE "cases" ALTER COLUMN "targetId" DROP NOT NULL;

-- 3. Yeni index ekle
CREATE INDEX IF NOT EXISTS "cases_guildId_targetChannelId_idx" ON "cases"("guildId", "targetChannelId");

-- Not: Bu migration之後:
-- - Mevcut tüm Case kayıtlarında targetId değerleri KORUNUR
-- - Yeni kanal hedefli Case'lerde targetId = null, targetChannelId = kanal_id olur
-- - Yeni kullanıcı hedefli Case'lerde targetId = kullanıcı_id, targetChannelId = null olur
