-- Migration: Ganti URL foto dari R2 public domain ke /api/media/ proxy
-- Jalankan via Cloudflare Dashboard > D1 > Console  atau  wrangler d1 execute

-- 1. Siswa: foto_url
UPDATE siswa
SET foto_url = REPLACE(foto_url, 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/', '/api/media/')
WHERE foto_url IS NOT NULL AND foto_url LIKE 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/%';

-- 2. User: avatar_url
UPDATE "user"
SET avatar_url = REPLACE(avatar_url, 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/', '/api/media/')
WHERE avatar_url IS NOT NULL AND avatar_url LIKE 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/%';

-- 3. Surat pelanggaran: foto_url
UPDATE surat_pelanggaran
SET foto_url = REPLACE(foto_url, 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/', '/api/media/')
WHERE foto_url IS NOT NULL AND foto_url LIKE 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/%';

-- 4. Agenda guru: foto_url (jika ada)
UPDATE agenda_guru
SET foto_url = REPLACE(foto_url, 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/', '/api/media/')
WHERE foto_url IS NOT NULL AND foto_url LIKE 'https://pub-cf9e4144c81e46f1b06fb2a0d277b844.r2.dev/%';
