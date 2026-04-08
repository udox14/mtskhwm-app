# MTS KH A Wahab Muhsin

Aplikasi manajemen pesantren (Next.js 16 + TypeScript), deploy ke **Cloudflare Workers** via OpenNext.

## Stack
- **Runtime**: Cloudflare Workers (bukan Node.js biasa)
- **DB**: Cloudflare D1 (SQLite) — akses via `utils/db.ts`
- **Storage**: R2 (`utils/r2.ts`) — media siswa/guru via `/api/media/[...path]`
- **Cache**: Cloudflare KV (`NEXT_INC_CACHE_KV`)
- **Auth**: Better Auth (`utils/auth/`)

## Aturan Coding
- Semua DB call wajib pakai helpers di `utils/db.ts` (`dbSelect`, `dbInsert`, `dbUpdate`, `dbDelete`, `dbBatchInsert`)
- Jangan raw `db.prepare().all()` langsung — pakai helpers atau raw hanya untuk query kompleks
- Server Actions (`actions.ts`) untuk mutasi data, bukan API routes
- Migrasi: **jangan jalankan semua sekaligus** — pakai `wrangler d1 execute mtskhwm-db --file=migrations/xxx.sql`
- Boolean di SQLite = `0/1` (bukan `true/false`)
- UUID: `lower(hex(randomblob(16)))` atau pre-generate di JS

## Struktur Penting
- `app/dashboard/[fitur]/actions.ts` — Server Actions tiap fitur
- `app/dashboard/[fitur]/components/[nama]-client.tsx` — Client component utama
- `utils/db.ts` — DB helpers
- `utils/cache.ts` — Query data statis (tahun ajaran aktif, master pelanggaran, mapel)
- `lib/features.ts` — Role-based access control
- `config/menu.ts` — Definisi menu & feature IDs
- `migrations/schema.sql` — Schema lengkap terkini

## Fitur & Modul
Siswa, Kelas, Guru, Akademik (nilai/jadwal), Kehadiran, Presensi (kamera), Rekap Absensi, BK, Izin, Kedisiplinan, Agenda, Monitoring, PPDB (plotting/psikotes/program unggulan), Surat, Sarpras, Settings

## Referensi Detail
- Schema DB: `migrations/schema.sql`
- Konfigurasi deploy: `wrangler.toml`
- Feature flags: `lib/features.ts` + `config/menu.ts`
- Style UI: Tailwind + shadcn/ui (komponen di `components/ui/`)
