// Lokasi: app/dashboard/monitoring-presensi/actions.ts
'use server'

import { getDB, dbUpdate } from '@/utils/db'
import { revalidatePath } from 'next/cache'

// ============================================================
// GET PRESENSI HARIAN (semua pegawai untuk 1 tanggal)
// ============================================================
export async function getPresensiByTanggal(tanggal: string) {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT p.*, u.nama_lengkap, u.domisili_pegawai, j.nama as jabatan_nama
    FROM presensi_pegawai p
    JOIN "user" u ON p.user_id = u.id
    LEFT JOIN master_jabatan_struktural j ON u.jabatan_struktural_id = j.id
    WHERE p.tanggal = ?
    ORDER BY u.nama_lengkap ASC
  `).bind(tanggal).all<any>()
  return result.results || []
}

// ============================================================
// GET PRESENSI RENTANG WAKTU
// ============================================================
export async function getPresensiByRange(dari: string, sampai: string) {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT p.*, u.nama_lengkap, u.domisili_pegawai, j.nama as jabatan_nama
    FROM presensi_pegawai p
    JOIN "user" u ON p.user_id = u.id
    LEFT JOIN master_jabatan_struktural j ON u.jabatan_struktural_id = j.id
    WHERE p.tanggal >= ? AND p.tanggal <= ?
    ORDER BY p.tanggal DESC, u.nama_lengkap ASC
  `).bind(dari, sampai).all<any>()
  return result.results || []
}

// ============================================================
// GET PRESENSI PER ORANG
// ============================================================
export async function getPresensiPerOrang(userId: string, dari: string, sampai: string) {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT p.*, u.nama_lengkap, u.domisili_pegawai, j.nama as jabatan_nama
    FROM presensi_pegawai p
    JOIN "user" u ON p.user_id = u.id
    LEFT JOIN master_jabatan_struktural j ON u.jabatan_struktural_id = j.id
    WHERE p.user_id = ? AND p.tanggal >= ? AND p.tanggal <= ?
    ORDER BY p.tanggal ASC
  `).bind(userId, dari, sampai).all<any>()
  return result.results || []
}

// ============================================================
// GET SEMUA PEGAWAI STRUKTURAL (untuk filter dropdown)
// ============================================================
export async function getAllPegawaiStruktural() {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT u.id, u.nama_lengkap, u.domisili_pegawai, j.nama as jabatan_nama
    FROM "user" u
    INNER JOIN master_jabatan_struktural j ON u.jabatan_struktural_id = j.id
    ORDER BY j.urutan ASC, u.nama_lengkap ASC
  `).all<any>()
  return result.results || []
}

// ============================================================
// SIMPAN PENGATURAN PRESENSI
// ============================================================
export async function simpanPengaturanPresensi(data: {
  jam_masuk: string; jam_pulang: string;
  batas_telat_menit: number; batas_pulang_cepat_menit: number;
  hari_kerja: number[]
}): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    await db.prepare(`
    UPDATE pengaturan_presensi SET
      jam_masuk = ?, jam_pulang = ?,
      batas_telat_menit = ?, batas_pulang_cepat_menit = ?,
      hari_kerja = ?, updated_at = datetime('now')
    WHERE id = 'global'
  `).bind(
      data.jam_masuk, data.jam_pulang,
      data.batas_telat_menit, data.batas_pulang_cepat_menit,
      JSON.stringify(data.hari_kerja)
    ).run()
    revalidatePath('/dashboard/monitoring-presensi')
    revalidatePath('/dashboard/presensi')
    return { success: 'Pengaturan presensi berhasil disimpan.' }
  } catch (e: any) {
    return { error: e.message || 'Gagal menyimpan pengaturan presensi.' }
  }
}

// ============================================================
// SIMPAN PENGATURAN TUNJANGAN
// ============================================================
export async function simpanPengaturanTunjangan(data: {
  nominal_dalam: number; nominal_luar: number;
  tanggal_bayar: number;
  aturan_tiers: { sampai_jam: string | null; persen: number; label: string }[]
}): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    await db.prepare(`
    UPDATE pengaturan_tunjangan SET
      nominal_dalam = ?, nominal_luar = ?,
      tanggal_bayar = ?, aturan_tiers = ?,
      updated_at = datetime('now')
    WHERE id = 'global'
  `).bind(
      data.nominal_dalam, data.nominal_luar,
      data.tanggal_bayar, JSON.stringify(data.aturan_tiers)
    ).run()
    revalidatePath('/dashboard/monitoring-presensi')
    return { success: 'Pengaturan tunjangan berhasil disimpan.' }
  } catch (e: any) {
    return { error: e.message || 'Gagal menyimpan pengaturan tunjangan.' }
  }
}

// ============================================================
// HITUNG TUNJANGAN PER ORANG UNTUK 1 BULAN
// Logika: tunjangan ditentukan per hari berdasarkan jam masuk
// Tiers dikonfigurasi dari DB (pengaturan_tunjangan.aturan_tiers)
//
// Format tier: { sampai_jam: "HH:MM:SS" | null, persen: number, label: string }
// Tier terakhir (sampai_jam = null) berlaku untuk semua jam setelahnya (0%)
// ============================================================

export type JamMasukTier = {
  sampai_jam: string | null  // "HH:MM:SS" atau null (= tidak terbatas / 0%)
  persen: number
  label: string
}

/** Tier default — dipakai jika DB belum memiliki aturan baru */
export function getDefaultJamTiers(): JamMasukTier[] {
  return [
    { sampai_jam: '07:15:00', persen: 100, label: 's/d 07.15' },
    { sampai_jam: '07:30:00', persen: 75,  label: '07.15 – 07.30' },
    { sampai_jam: '08:00:00', persen: 50,  label: '07.30 – 08.00' },
    { sampai_jam: null,       persen: 0,   label: '> 08.00' },
  ]
}

/**
 * Hitung persen tunjangan untuk 1 hari berdasarkan jam_masuk dan tiers dari DB.
 * Jika jam_masuk null (tidak hadir) → 0%.
 */
export function hitungPersenHari(jamMasuk: string | null, tiers: JamMasukTier[]): number {
  if (!jamMasuk) return 0
  const jam = jamMasuk.length === 5 ? jamMasuk + ':00' : jamMasuk
  for (const tier of tiers) {
    if (tier.sampai_jam === null) return tier.persen  // catch-all tier
    if (jam <= tier.sampai_jam) return tier.persen
  }
  return 0
}

export async function hitungTunjanganBulanan(bulan: number, tahun: number) {
  const db = await getDB()

  // Get settings
  const tunjSetting = await db.prepare('SELECT * FROM pengaturan_tunjangan WHERE id = ?').bind('global').first<any>()
  const presSetting = await db.prepare('SELECT * FROM pengaturan_presensi WHERE id = ?').bind('global').first<any>()

  const nominalDalam = tunjSetting?.nominal_dalam || 0
  const nominalLuar  = tunjSetting?.nominal_luar  || 0

  // Parse tiers dari DB — fallback ke default jika belum dikonfigurasi / format lama
  let tiers: JamMasukTier[] = getDefaultJamTiers()
  try {
    const raw = JSON.parse(tunjSetting?.aturan_tiers || '[]')
    // Deteksi format baru: harus punya field sampai_jam
    if (Array.isArray(raw) && raw.length > 0 && 'sampai_jam' in raw[0]) {
      tiers = raw as JamMasukTier[]
    }
    // Format lama (min/max/persen) → abaikan, pakai default
  } catch {}

  let hariKerja: number[] = []
  try { hariKerja = JSON.parse(presSetting?.hari_kerja || '[1,2,3,4,5,6]') } catch {}

  // Hitung total hari kerja dalam bulan
  const daysInMonth = new Date(tahun, bulan, 0).getDate()
  let totalHariKerja = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(tahun, bulan - 1, d).getDay()
    const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    if (hariKerja.includes(mappedDay)) totalHariKerja++
  }

  // Date range
  const dari   = `${tahun}-${String(bulan).padStart(2, '0')}-01`
  const sampai = `${tahun}-${String(bulan).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  // Ambil semua pegawai struktural
  const staffResult = await db.prepare(`
    SELECT u.id, u.nama_lengkap, u.domisili_pegawai, j.nama as jabatan_nama
    FROM "user" u
    INNER JOIN master_jabatan_struktural j ON u.jabatan_struktural_id = j.id
    ORDER BY j.urutan ASC, u.nama_lengkap ASC
  `).all<any>()

  // Ambil semua presensi dalam range
  const presensiResult = await db.prepare(`
    SELECT user_id, tanggal, status, jam_masuk, is_telat, is_pulang_cepat
    FROM presensi_pegawai
    WHERE tanggal >= ? AND tanggal <= ?
  `).bind(dari, sampai).all<any>()

  // Group presensi by user
  const presensiByUser = new Map<string, any[]>()
  for (const p of (presensiResult.results || [])) {
    const arr = presensiByUser.get(p.user_id) || []
    arr.push(p)
    presensiByUser.set(p.user_id, arr)
  }

  // Hitung tunjangan per orang
  const hasil = (staffResult.results || []).map((s: any) => {
    const records = presensiByUser.get(s.id) || []

    const hadir     = records.filter((r: any) => r.status === 'hadir').length
    const sakit     = records.filter((r: any) => r.status === 'sakit').length
    const izin      = records.filter((r: any) => r.status === 'izin').length
    const alfa      = records.filter((r: any) => r.status === 'alfa').length
    const dinasLuar = records.filter((r: any) => r.status === 'dinas_luar').length
    const telat     = records.filter((r: any) => r.is_telat).length
    const pulangCepat = records.filter((r: any) => r.is_pulang_cepat).length

    // Hitung total persen dari setiap hari yang tercatat
    const totalPersenTercatat = records.reduce((sum: number, r: any) => {
      return sum + hitungPersenHari(r.jam_masuk, tiers)
    }, 0)

    const persenRataRata = totalHariKerja > 0
      ? Math.round((totalPersenTercatat / totalHariKerja))
      : 0

    const nominal = s.domisili_pegawai === 'dalam' ? nominalDalam : nominalLuar
    const tunjanganDiterima = totalHariKerja > 0
      ? Math.round((totalPersenTercatat / totalHariKerja / 100) * nominal)
      : 0

    // Breakdown per tier — dinamis sesuai jumlah tiers di DB
    const tierBreakdown = tiers.map(tier =>
      records.filter((r: any) => hitungPersenHari(r.jam_masuk, tiers) === tier.persen &&
        // pastikan tier yang sama tidak double-count jika ada 2 tier dengan persen sama
        tiers.indexOf(tier) === tiers.findIndex(t => t.persen === tier.persen)
      ).length
    )
    // Hari tidak hadir (tidak ada record) hitung ke tier 0%
    const hariTidakHadir = totalHariKerja - records.length

    // Shorthand untuk kolom UI (4 tier standar: 100/75/50/0)
    const persenList = tiers.map(t => t.persen)
    const tier100 = records.filter((r: any) => hitungPersenHari(r.jam_masuk, tiers) === 100).length
    const tier75  = records.filter((r: any) => hitungPersenHari(r.jam_masuk, tiers) === 75).length
    const tier50  = records.filter((r: any) => hitungPersenHari(r.jam_masuk, tiers) === 50).length
    const tier0   = hariTidakHadir + records.filter((r: any) => hitungPersenHari(r.jam_masuk, tiers) === 0).length

    return {
      id: s.id,
      nama_lengkap: s.nama_lengkap,
      jabatan_nama: s.jabatan_nama,
      domisili: s.domisili_pegawai || '-',
      hadir, sakit, izin, alfa, dinasLuar, telat, pulangCepat,
      totalHariKerja,
      tier100, tier75, tier50, tier0,
      tierBreakdown,
      persenList,
      totalPersenTercatat,
      persenRataRata,
      nominal,
      tunjanganDiterima,
    }
  })

  return {
    bulan, tahun, totalHariKerja,
    nominalDalam, nominalLuar,
    tiers,  // expose ke UI agar bisa render header tabel dinamis
    data: hasil,
  }
}
