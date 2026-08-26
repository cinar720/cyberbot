-- Case tablosuna metadata alanı eklendi (jail rol snapshot için)
ALTER TABLE "cases" ADD COLUMN IF NOT EXISTS "metadata" JSONB;
