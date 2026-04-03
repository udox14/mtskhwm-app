// Lokasi: app/dashboard/surat/actions.ts
'use server'

import { getDB } from '@/utils/db'
import { revalidatePath } from 'next/cache'

// ============================================================
// TYPES
// ============================================================
export type JenisSurat =
  | 'penerimaan'
  | 'sppd'
  | 'izin_pesantren'
  | 'ket_aktif'
  | 'permohonan'
  | 'surat_tugas'
  | 'undangan_rapat'
  | 'pindah'
  | 'pernyataan'
  | 'kelakuan_baik'

export const JENIS_SURAT_LABEL: Record<JenisSurat, string> = {
  penerimaan: 'Surat Keterangan Penerimaan',
  sppd: 'SPPD',
  izin_pesantren: 'Surat Izin ke Pesantren',
  ket_aktif: 'Surat Keterangan Aktif',
  permohonan: 'Surat Permohonan',
  surat_tugas: 'Surat Tugas',
  undangan_rapat: 'Surat Undangan Rapat',
  pindah: 'Surat Keterangan Pindah',
  pernyataan: 'Surat Pernyataan',
  kelakuan_baik: 'Surat Kelakuan Baik',
}

const BULAN_ROMAWI = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']

// ============================================================
// GET DATA FOR SURAT (siswa, guru, pejabat, kelas)
// ============================================================
export async function getDataForSurat() {
  const db = await getDB()

  const [siswaRes, guruRes, kelasRes, jabatanRes] = await Promise.all([
    db.prepare(`
      SELECT s.id, s.nisn, s.nis_lokal, s.nama_lengkap, s.jenis_kelamin, s.tempat_lahir, s.tanggal_lahir,
        s.nik, s.alamat_lengkap, s.rt, s.rw, s.desa_kelurahan, s.kecamatan, s.kabupaten_kota, s.provinsi, s.kode_pos,
        s.nama_ayah, s.pekerjaan_ayah, s.nama_ibu, s.pekerjaan_ibu, s.nik_ayah,
        s.kelas_id, s.status,
        k.tingkat, k.nomor_kelas, k.kelompok
      FROM siswa s LEFT JOIN kelas k ON s.kelas_id = k.id
      WHERE s.status = 'aktif'
      ORDER BY s.nama_lengkap ASC
    `).all<any>(),

    db.prepare(`
      SELECT u.id, u.nama_lengkap, u.role,
        mj.nama as jabatan_struktural
      FROM "user" u
      LEFT JOIN master_jabatan_struktural mj ON u.jabatan_struktural_id = mj.id
      WHERE u.banned = 0
      ORDER BY mj.urutan ASC NULLS LAST, u.nama_lengkap ASC
    `).all<any>(),

    db.prepare(`
      SELECT id, tingkat, nomor_kelas, kelompok FROM kelas ORDER BY tingkat, nomor_kelas
    `).all<any>(),

    db.prepare(`
      SELECT mj.id, mj.nama, mj.urutan, u.id as user_id, u.nama_lengkap
      FROM master_jabatan_struktural mj
      LEFT JOIN "user" u ON u.jabatan_struktural_id = mj.id
      ORDER BY mj.urutan ASC
    `).all<any>(),
  ])

  return {
    siswa: siswaRes.results || [],
    guru: guruRes.results || [],
    kelas: kelasRes.results || [],
    pejabat: jabatanRes.results || [],
  }
}

// ============================================================
// GET NEXT NOMOR SURAT (global sequential per tahun)
// ============================================================
export async function getNextNomorUrut(tahun: number): Promise<number> {
  const db = await getDB()
  const result = await db.prepare(
    'SELECT MAX(nomor_urut) as max_urut FROM surat_keluar WHERE tahun = ?'
  ).bind(tahun).first<any>()
  return (result?.max_urut || 0) + 1
}

// ============================================================
// FORMAT NOMOR SURAT
// ============================================================
export function formatNomorSurat(nomorUrut: number, bulan: number, tahun: number): string {
  const nomor = String(nomorUrut).padStart(3, '0')
  const bulanRomawi = BULAN_ROMAWI[bulan] || String(bulan)
  return `${nomor}/Mts.10.06.696/PP.00.5/${bulanRomawi}/${tahun}`
}

// ============================================================
// SIMPAN SURAT KELUAR
// ============================================================
export async function simpanSuratKeluar(data: {
  jenis_surat: JenisSurat
  perihal?: string
  data_surat: any
  dicetak_oleh: string
  nama_pencetak: string
}): Promise<{ success?: string; error?: string; nomor_surat?: string; id?: string }> {
  const db = await getDB()

  const now = new Date()
  const tahun = now.getFullYear()
  const bulan = now.getMonth() + 1

  const nomorUrut = await getNextNomorUrut(tahun)
  const nomorSurat = formatNomorSurat(nomorUrut, bulan, tahun)

  try {
    const result = await db.prepare(`
      INSERT INTO surat_keluar (id, jenis_surat, nomor_urut, nomor_surat, tahun, perihal, data_surat, dicetak_oleh, nama_pencetak)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id
    `).bind(
      data.jenis_surat,
      nomorUrut,
      nomorSurat,
      tahun,
      data.perihal || null,
      JSON.stringify(data.data_surat),
      data.dicetak_oleh,
      data.nama_pencetak
    ).first<any>()

    revalidatePath('/dashboard/surat')
    return { success: 'Surat berhasil disimpan!', nomor_surat: nomorSurat, id: result?.id }
  } catch (e: any) {
    return { error: 'Gagal menyimpan surat: ' + (e?.message || '') }
  }
}

// ============================================================
// GET LOG SURAT KELUAR
// ============================================================
export async function getSuratKeluar(filters?: {
  jenis_surat?: JenisSurat
  bulan?: number
  tahun?: number
}): Promise<any[]> {
  const db = await getDB()
  let sql = `SELECT id, jenis_surat, nomor_urut, nomor_surat, tahun, perihal, nama_pencetak, created_at FROM surat_keluar WHERE 1=1`
  const params: any[] = []

  if (filters?.jenis_surat) {
    sql += ' AND jenis_surat = ?'
    params.push(filters.jenis_surat)
  }
  if (filters?.tahun) {
    sql += ' AND tahun = ?'
    params.push(filters.tahun)
  }
  if (filters?.bulan) {
    sql += ` AND CAST(strftime('%m', created_at) AS INTEGER) = ?`
    params.push(filters.bulan)
  }

  sql += ' ORDER BY nomor_urut DESC'

  const result = await db.prepare(sql).bind(...params).all<any>()
  return result.results || []
}

// ============================================================
// HAPUS SURAT KELUAR
// ============================================================
export async function hapusSuratKeluar(id: string): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    await db.prepare('DELETE FROM surat_keluar WHERE id = ?').bind(id).run()
    revalidatePath('/dashboard/surat')
    return { success: 'Surat berhasil dihapus dari log.' }
  } catch (e: any) {
    return { error: 'Gagal menghapus: ' + (e?.message || '') }
  }
}
