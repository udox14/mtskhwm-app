# MTSKHWM — ERP MTs KH. A. Wahab Muhsin Sukahideng

Sistem Informasi Manajemen Terpadu untuk MTs KH. A. Wahab Muhsin Sukahideng.

## Stack

- **Frontend:** Next.js 16 + Tailwind CSS
- **Backend:** Cloudflare Workers (via OpenNext)
- **Database:** Cloudflare D1 (SQLite)
- **Storage:** Cloudflare R2
- **Auth:** Custom JWT (PBKDF2 + session token)

## Setup

1. Install dependencies: `npm install`
2. Init DB lokal: `npm run db:init`
3. Init DB remote: `npm run db:init:remote`
4. Dev: `npm run dev`
5. Deploy: `npm run deploy`

## Cloudflare Resources

- Worker: `mtskhwm`
- D1: `mtskhwm-db`
- R2: `mtskhwm-media`
- KV: `NEXT_INC_CACHE_KV`

## Default Login

Password default pegawai: `mtskhwm2026`
