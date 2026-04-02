// Lokasi: app/dashboard/program-unggulan/kelola/actions.ts
'use server'

import { getDB, dbInsert, dbUpdate, dbDelete } from '@/utils/db'
import { revalidatePath } from 'next/cache'

const REVAL = '/dashboard/program-unggulan/kelola'

// ============================================================
// TYPES
// ============================================================
type KelasUnggulanRow = {
  id: string; kelas_id: string; tingkat: number; nomor_kelas: string; kelompok: string
}
type GuruKelasRow = {
  id: string; guru_id: string; guru_nama: string; jam_mengajar: number; pu_kelas_id: string
}
type MateriRow = {
  id: string; judul: string; konten: string; urutan: number; is_active: number
  pu_kelas_id: string; kelas_label?: string
}

// ============================================================
// 1. KELAS UNGGULAN CRUD
// ============================================================
export async function getKelasUnggulanAdmin() {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { data: [], taId: null, error: 'Tahun ajaran aktif belum diatur' }

  const result = await db.prepare(`
    SELECT pk.id, pk.kelas_id, k.tingkat, k.nomor_kelas, k.kelompok
    FROM pu_kelas_unggulan pk
    JOIN kelas k ON pk.kelas_id = k.id
    WHERE pk.tahun_ajaran_id = ?
    ORDER BY k.tingkat, k.kelompok, k.nomor_kelas
  `).bind(ta.id).all<KelasUnggulanRow>()

  return { data: result.results || [], taId: ta.id, error: null }
}

export async function tambahKelasUnggulan(kelasId: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { error: 'Tahun ajaran aktif belum diatur' }

  const result = await dbInsert(db, 'pu_kelas_unggulan', { kelas_id: kelasId, tahun_ajaran_id: ta.id })
  if (result.error) {
    if (result.error.includes('UNIQUE')) return { error: 'Kelas ini sudah ditambahkan' }
    return { error: result.error }
  }
  revalidatePath(REVAL)
  return { success: 'Kelas unggulan berhasil ditambahkan' }
}

export async function hapusKelasUnggulan(id: string) {
  const db = await getDB()
  const result = await dbDelete(db, 'pu_kelas_unggulan', { id })
  if (result.error) return { error: result.error }
  revalidatePath(REVAL)
  return { success: 'Kelas unggulan berhasil dihapus (beserta guru & materi terkait)' }
}

// ============================================================
// 2. GURU ASSIGNMENT CRUD
// ============================================================
export async function getGuruKelasByPuKelas(puKelasId: string) {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT pg.id, pg.guru_id, u.nama_lengkap AS guru_nama, pg.jam_mengajar, pg.pu_kelas_id
    FROM pu_guru_kelas pg
    JOIN "user" u ON pg.guru_id = u.id
    WHERE pg.pu_kelas_id = ?
    ORDER BY u.nama_lengkap
  `).bind(puKelasId).all<GuruKelasRow>()
  return result.results || []
}

export async function tambahGuruKelas(puKelasId: string, guruId: string, jamMengajar: number) {
  const db = await getDB()
  const result = await dbInsert(db, 'pu_guru_kelas', {
    guru_id: guruId, pu_kelas_id: puKelasId, jam_mengajar: jamMengajar
  })
  if (result.error) {
    if (result.error.includes('UNIQUE')) return { error: 'Guru ini sudah di-assign ke kelas ini' }
    return { error: result.error }
  }
  revalidatePath(REVAL)
  return { success: 'Guru berhasil ditambahkan' }
}

export async function editJamMengajar(id: string, jamMengajar: number) {
  const db = await getDB()
  const result = await dbUpdate(db, 'pu_guru_kelas', { jam_mengajar: jamMengajar }, { id })
  if (result.error) return { error: result.error }
  revalidatePath(REVAL)
  return { success: 'Jam mengajar berhasil diperbarui' }
}

export async function hapusGuruKelas(id: string) {
  const db = await getDB()
  const result = await dbDelete(db, 'pu_guru_kelas', { id })
  if (result.error) return { error: result.error }
  revalidatePath(REVAL)
  return { success: 'Guru berhasil dihapus dari kelas unggulan' }
}

// Suggest guru dari penugasan_mengajar existing
export async function suggestGuruFromPenugasan(kelasId: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return []

  const result = await db.prepare(`
    SELECT DISTINCT pm.guru_id, u.nama_lengkap AS guru_nama,
      COUNT(jm.id) AS total_jam
    FROM penugasan_mengajar pm
    JOIN "user" u ON pm.guru_id = u.id
    LEFT JOIN jadwal_mengajar jm ON jm.penugasan_id = pm.id
    WHERE pm.kelas_id = ? AND pm.tahun_ajaran_id = ?
    GROUP BY pm.guru_id, u.nama_lengkap
    ORDER BY u.nama_lengkap
  `).bind(kelasId, ta.id).all<{ guru_id: string; guru_nama: string; total_jam: number }>()
  return result.results || []
}

// ============================================================
// 3. MATERI TES CRUD
// ============================================================
export async function getMateriAdmin(puKelasId?: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return []

  let sql = `
    SELECT m.id, m.judul, m.konten, m.urutan, m.is_active, m.pu_kelas_id,
      k.tingkat || '-' || k.nomor_kelas || ' ' || k.kelompok AS kelas_label
    FROM pu_materi m
    JOIN pu_kelas_unggulan pk ON m.pu_kelas_id = pk.id
    JOIN kelas k ON pk.kelas_id = k.id
    WHERE pk.tahun_ajaran_id = ?
  `
  const params: unknown[] = [ta.id]
  if (puKelasId) { sql += ' AND m.pu_kelas_id = ?'; params.push(puKelasId) }
  sql += ' ORDER BY m.pu_kelas_id, m.urutan, m.created_at'

  const result = await db.prepare(sql).bind(...params).all<MateriRow>()
  return result.results || []
}

export async function tambahMateri(puKelasId: string, judul: string, konten: string, urutan: number) {
  const db = await getDB()
  const result = await dbInsert(db, 'pu_materi', {
    pu_kelas_id: puKelasId, judul, konten, urutan, is_active: 1
  })
  if (result.error) return { error: result.error }
  revalidatePath(REVAL)
  return { success: 'Materi berhasil ditambahkan' }
}

export async function editMateri(id: string, judul: string, konten: string, urutan: number, isActive: boolean) {
  const db = await getDB()
  const result = await dbUpdate(db, 'pu_materi', {
    judul, konten, urutan, is_active: isActive ? 1 : 0, updated_at: new Date().toISOString()
  }, { id })
  if (result.error) return { error: result.error }
  revalidatePath(REVAL)
  return { success: 'Materi berhasil diperbarui' }
}

export async function hapusMateri(id: string) {
  const db = await getDB()
  const result = await dbDelete(db, 'pu_materi', { id })
  if (result.error) return { error: result.error }
  revalidatePath(REVAL)
  return { success: 'Materi berhasil dihapus' }
}

// ============================================================
// 4. MONITORING — Data lengkap pengetesan
// ============================================================
export async function getMonitoringData(puKelasId?: string, tanggalDari?: string, tanggalSampai?: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { guruActivity: [], siswaRekap: [] }

  // — Aktivitas guru (siapa ngetes siapa, kapan)
  let guruSql = `
    SELECT ht.id, ht.tanggal, ht.status, ht.nilai, ht.round_number,
      u.nama_lengkap AS guru_nama, u.id AS guru_id,
      s.nama_lengkap AS siswa_nama, s.id AS siswa_id,
      k.tingkat || '-' || k.nomor_kelas || ' ' || k.kelompok AS kelas_label,
      ht.pu_kelas_id
    FROM pu_hasil_tes ht
    JOIN "user" u ON ht.guru_id = u.id
    JOIN siswa s ON ht.siswa_id = s.id
    JOIN pu_kelas_unggulan pk ON ht.pu_kelas_id = pk.id
    JOIN kelas k ON pk.kelas_id = k.id
    WHERE pk.tahun_ajaran_id = ?
  `
  const guruParams: unknown[] = [ta.id]
  if (puKelasId) { guruSql += ' AND ht.pu_kelas_id = ?'; guruParams.push(puKelasId) }
  if (tanggalDari) { guruSql += ' AND ht.tanggal >= ?'; guruParams.push(tanggalDari) }
  if (tanggalSampai) { guruSql += ' AND ht.tanggal <= ?'; guruParams.push(tanggalSampai) }
  guruSql += ' ORDER BY ht.tanggal DESC, u.nama_lengkap'

  const guruResult = await db.prepare(guruSql).bind(...guruParams).all<any>()

  // — Rekap siswa (berapa kali dites, nilainya apa)
  let siswaSql = `
    SELECT s.id AS siswa_id, s.nama_lengkap AS siswa_nama, s.foto_url,
      k.tingkat || '-' || k.nomor_kelas || ' ' || k.kelompok AS kelas_label,
      ht.pu_kelas_id,
      COUNT(CASE WHEN ht.status = 'sudah' THEN 1 END) AS total_tes,
      COUNT(CASE WHEN ht.nilai = 'Lancar' THEN 1 END) AS lancar,
      COUNT(CASE WHEN ht.nilai = 'Kurang Lancar' THEN 1 END) AS kurang_lancar,
      COUNT(CASE WHEN ht.nilai = 'Tidak Lancar' THEN 1 END) AS tidak_lancar,
      COUNT(CASE WHEN ht.status IN ('sakit','izin','alfa') THEN 1 END) AS absen
    FROM siswa s
    JOIN kelas k ON s.kelas_id = k.id
    JOIN pu_kelas_unggulan pk ON pk.kelas_id = k.id AND pk.tahun_ajaran_id = ?
    LEFT JOIN pu_hasil_tes ht ON ht.siswa_id = s.id AND ht.pu_kelas_id = pk.id
    WHERE s.status = 'aktif'
  `
  const siswaParams: unknown[] = [ta.id]
  if (puKelasId) { siswaSql += ' AND pk.id = ?'; siswaParams.push(puKelasId) }
  siswaSql += ' GROUP BY s.id, s.nama_lengkap, s.foto_url, kelas_label, ht.pu_kelas_id'
  siswaSql += ' ORDER BY kelas_label, s.nama_lengkap'

  const siswaResult = await db.prepare(siswaSql).bind(...siswaParams).all<any>()

  return {
    guruActivity: guruResult.results || [],
    siswaRekap: siswaResult.results || []
  }
}

// ============================================================
// 5. DATA UNTUK DROPDOWN
// ============================================================
export async function getAllKelasForDropdown() {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT id, tingkat, nomor_kelas, kelompok
    FROM kelas ORDER BY tingkat, kelompok, nomor_kelas
  `).all<{ id: string; tingkat: number; nomor_kelas: string; kelompok: string }>()
  return result.results || []
}

export async function getAllGuruForDropdown() {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT id, nama_lengkap FROM "user"
    WHERE role IN ('guru','wali_kelas','wakamad','guru_piket','guru_ppl')
    ORDER BY nama_lengkap
  `).all<{ id: string; nama_lengkap: string }>()
  return result.results || []
}

// ============================================================
// 6. UPLOAD MEDIA (gambar/audio) untuk materi
// ============================================================
export async function uploadMateriMedia(formData: FormData) {
  const file = formData.get('file') as File
  if (!file) return { error: 'File tidak ditemukan' }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) return { error: 'Ukuran file maksimal 5MB' }

  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/ogg'
  ]
  if (!allowedTypes.includes(file.type)) return { error: 'Format file tidak didukung' }

  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare')
    const { env } = await getCloudflareContext({ async: true })
    const r2 = env.R2 as R2Bucket

    const ext = file.name.split('.').pop() || 'bin'
    const key = `program-unggulan/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buffer = await file.arrayBuffer()
    await r2.put(key, buffer, { httpMetadata: { contentType: file.type } })

    const publicUrl = `${process.env.R2_PUBLIC_URL}/${key}`
    return { url: publicUrl, type: file.type.startsWith('audio/') ? 'audio' : 'image' }
  } catch (e: any) {
    return { error: `Upload gagal: ${e.message}` }
  }
}

// ============================================================
// 7. DATA UNTUK LAPORAN PDF/EXCEL
// ============================================================
export async function getLaporanData(puKelasId?: string, tanggalDari?: string, tanggalSampai?: string) {
  // Reuse monitoring data + tambahan info
  const monitoring = await getMonitoringData(puKelasId, tanggalDari, tanggalSampai)

  const db = await getDB()
  const ta = await db.prepare('SELECT nama, semester FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ nama: string; semester: number }>()

  // Guru summary (total sesi tes)
  const guruMap = new Map<string, { nama: string; total_sesi: number; total_siswa: number; tanggal_set: Set<string> }>()
  for (const row of monitoring.guruActivity) {
    if (!guruMap.has(row.guru_id)) {
      guruMap.set(row.guru_id, { nama: row.guru_nama, total_sesi: 0, total_siswa: 0, tanggal_set: new Set() })
    }
    const g = guruMap.get(row.guru_id)!
    if (row.status === 'sudah') g.total_siswa++
    g.tanggal_set.add(row.tanggal)
  }
  for (const g of guruMap.values()) { g.total_sesi = g.tanggal_set.size }

  const guruSummary = Array.from(guruMap.entries()).map(([id, v]) => ({
    guru_id: id, guru_nama: v.nama, total_sesi: v.total_sesi, total_siswa_dites: v.total_siswa
  })).sort((a, b) => a.guru_nama.localeCompare(b.guru_nama))

  return {
    tahunAjaran: ta ? `${ta.nama} - Semester ${ta.semester}` : '-',
    guruActivity: monitoring.guruActivity,
    siswaRekap: monitoring.siswaRekap,
    guruSummary
  }
}
