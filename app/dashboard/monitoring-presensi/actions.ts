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
}) {
  const db = await getDB()
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
}

// ============================================================
// SIMPAN PENGATURAN TUNJANGAN
// ============================================================
export async function simpanPengaturanTunjangan(data: {
  nominal_dalam: number; nominal_luar: number;
  tanggal_bayar: number;
  aturan_tiers: { min: number; max: number; persen: number }[]
}) {
  const db = await getDB()
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
}

// ============================================================
// HITUNG TUNJANGAN PER ORANG UNTUK 1 BULAN
// ============================================================
export async function hitungTunjanganBulanan(bulan: number, tahun: number) {
  const db = await getDB()

  // Get settings
  const tunjSetting = await db.prepare('SELECT * FROM pengaturan_tunjangan WHERE id = ?').bind('global').first<any>()
  const presSetting = await db.prepare('SELECT * FROM pengaturan_presensi WHERE id = ?').bind('global').first<any>()

  const nominalDalam = tunjSetting?.nominal_dalam || 0
  const nominalLuar = tunjSetting?.nominal_luar || 0
  let tiers: { min: number; max: number; persen: number }[] = []
  try { tiers = JSON.parse(tunjSetting?.aturan_tiers || '[]') } catch {}

  let hariKerja: number[] = []
  try { hariKerja = JSON.parse(presSetting?.hari_kerja || '[1,2,3,4,5,6]') } catch {}

  // Calculate working days in this month
  const daysInMonth = new Date(tahun, bulan, 0).getDate()
  let totalHariKerja = 0
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(tahun, bulan - 1, d).getDay()
    // JS: 0=Minggu, 1=Senin.. we store 1=Senin..6=Sabtu
    const mappedDay = dayOfWeek === 0 ? 7 : dayOfWeek
    if (hariKerja.includes(mappedDay)) totalHariKerja++
  }

  // Date range
  const dari = `${tahun}-${String(bulan).padStart(2, '0')}-01`
  const sampai = `${tahun}-${String(bulan).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`

  // Get all structural staff
  const staffResult = await db.prepare(`
    SELECT u.id, u.nama_lengkap, u.domisili_pegawai, j.nama as jabatan_nama
    FROM "user" u
    INNER JOIN master_jabatan_struktural j ON u.jabatan_struktural_id = j.id
    ORDER BY j.urutan ASC, u.nama_lengkap ASC
  `).all<any>()

  // Get all presensi in range
  const presensiResult = await db.prepare(`
    SELECT user_id, status, is_telat, is_pulang_cepat
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

  // Calculate per person
  const hasil = (staffResult.results || []).map((s: any) => {
    const records = presensiByUser.get(s.id) || []
    const hadir = records.filter((r: any) => r.status === 'hadir').length
    const sakit = records.filter((r: any) => r.status === 'sakit').length
    const izin = records.filter((r: any) => r.status === 'izin').length
    const alfa = records.filter((r: any) => r.status === 'alfa').length
    const dinasLuar = records.filter((r: any) => r.status === 'dinas_luar').length
    const telat = records.filter((r: any) => r.is_telat).length
    const pulangCepat = records.filter((r: any) => r.is_pulang_cepat).length

    // Kehadiran efektif = hadir + dinas_luar (sakit/izin/alfa = tidak hadir untuk tunjangan)
    const kehadiranEfektif = hadir + dinasLuar
    const persenKehadiran = totalHariKerja > 0 ? Math.round((kehadiranEfektif / totalHariKerja) * 100) : 0

    // Find matching tier
    let persenTunjangan = 0
    for (const tier of tiers) {
      if (persenKehadiran >= tier.min && persenKehadiran <= tier.max) {
        persenTunjangan = tier.persen
        break
      }
    }

    const nominal = s.domisili_pegawai === 'dalam' ? nominalDalam : nominalLuar
    const tunjanganDiterima = Math.round((nominal * persenTunjangan) / 100)

    return {
      id: s.id,
      nama_lengkap: s.nama_lengkap,
      jabatan_nama: s.jabatan_nama,
      domisili: s.domisili_pegawai || '-',
      hadir, sakit, izin, alfa, dinasLuar, telat, pulangCepat,
      totalHariKerja,
      persenKehadiran,
      nominal,
      persenTunjangan,
      tunjanganDiterima,
    }
  })

  return {
    bulan, tahun, totalHariKerja,
    nominalDalam, nominalLuar, tiers,
    data: hasil,
  }
}
