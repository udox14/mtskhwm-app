// Lokasi: app/dashboard/program-unggulan/kelola/actions.ts
'use server'

import { getDB, dbInsert, dbDelete } from '@/utils/db'
import { revalidatePath } from 'next/cache'

const REVAL = '/dashboard/program-unggulan/kelola'

// ============================================================
// TYPES
// ============================================================
export type ProgramType = 'tahfidz' | 'bahasa_arab' | 'bahasa_inggris'

// ============================================================
// 1. KELAS UNGGULAN CRUD (tetap)
// ============================================================
export async function getKelasUnggulanAdmin() {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { data: [], taId: null, error: 'Tahun ajaran aktif belum diatur' }

  const result = await db.prepare(`
    SELECT pk.id, pk.kelas_id, k.tingkat, k.nomor_kelas, k.kelompok,
      (SELECT COUNT(*) FROM siswa s WHERE s.kelas_id = k.id AND s.status = 'aktif') as jumlah_siswa
    FROM pu_kelas_unggulan pk
    JOIN kelas k ON pk.kelas_id = k.id
    WHERE pk.tahun_ajaran_id = ?
    ORDER BY k.tingkat, CAST(k.nomor_kelas AS INTEGER), k.kelompok
  `).bind(ta.id).all<any>()

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
  return { success: 'Kelas unggulan berhasil dihapus' }
}

// ============================================================
// 2. AUTO-DETECT GURU dari penugasan_mengajar
// ============================================================
export async function getGuruAutoByKelas(kelasId: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return []

  const result = await db.prepare(`
    SELECT pm.guru_id, u.nama_lengkap as guru_nama,
      COUNT(DISTINCT jm.id) as total_jam,
      GROUP_CONCAT(DISTINCT mp.nama_mapel) as mapel_list
    FROM penugasan_mengajar pm
    JOIN "user" u ON pm.guru_id = u.id
    LEFT JOIN jadwal_mengajar jm ON jm.penugasan_id = pm.id
    LEFT JOIN mata_pelajaran mp ON pm.mapel_id = mp.id
    WHERE pm.kelas_id = ? AND pm.tahun_ajaran_id = ?
    GROUP BY pm.guru_id, u.nama_lengkap
    ORDER BY u.nama_lengkap
  `).bind(kelasId, ta.id).all<any>()
  return result.results || []
}

// ============================================================
// 3. MATERI MINGGUAN CRUD
// ============================================================
export async function getMateriMingguan(program?: ProgramType) {
  const db = await getDB()
  let sql = `
    SELECT m.id, m.program, m.minggu_mulai, m.konten, m.created_at, m.updated_at,
      GROUP_CONCAT(k.tingkat || '-' || k.nomor_kelas || ' ' || k.kelompok, ', ') as kelas_labels,
      GROUP_CONCAT(mk.pu_kelas_id) as pu_kelas_ids
    FROM pu_materi_mingguan m
    LEFT JOIN pu_materi_mingguan_kelas mk ON mk.materi_id = m.id
    LEFT JOIN pu_kelas_unggulan pk ON mk.pu_kelas_id = pk.id
    LEFT JOIN kelas k ON pk.kelas_id = k.id
    WHERE 1=1
  `
  const params: any[] = []
  if (program) { sql += ' AND m.program = ?'; params.push(program) }
  sql += ' GROUP BY m.id ORDER BY m.minggu_mulai DESC, m.program'

  const result = await db.prepare(sql).bind(...params).all<any>()
  return result.results || []
}

export async function simpanMateriMingguan(data: {
  program: ProgramType
  minggu_mulai: string
  konten: any
  pu_kelas_ids: string[]
  created_by: string
}): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    const res = await db.prepare(`
      INSERT INTO pu_materi_mingguan (id, program, minggu_mulai, konten, created_by)
      VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?) RETURNING id
    `).bind(data.program, data.minggu_mulai, JSON.stringify(data.konten), data.created_by).first<any>()

    if (res?.id && data.pu_kelas_ids.length > 0) {
      const stmts = data.pu_kelas_ids.map(pkId =>
        db.prepare(`INSERT INTO pu_materi_mingguan_kelas (id, materi_id, pu_kelas_id) VALUES (lower(hex(randomblob(16))), ?, ?)`)
          .bind(res.id, pkId)
      )
      await db.batch(stmts)
    }

    revalidatePath(REVAL)
    return { success: 'Materi mingguan berhasil disimpan' }
  } catch (e: any) {
    return { error: e.message || 'Gagal menyimpan materi' }
  }
}

export async function editMateriMingguan(id: string, data: {
  minggu_mulai: string
  konten: any
  pu_kelas_ids: string[]
}): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    await db.prepare(`UPDATE pu_materi_mingguan SET minggu_mulai = ?, konten = ?, updated_at = datetime('now') WHERE id = ?`)
      .bind(data.minggu_mulai, JSON.stringify(data.konten), id).run()

    // Replace kelas assignments
    await db.prepare('DELETE FROM pu_materi_mingguan_kelas WHERE materi_id = ?').bind(id).run()
    if (data.pu_kelas_ids.length > 0) {
      const stmts = data.pu_kelas_ids.map(pkId =>
        db.prepare(`INSERT INTO pu_materi_mingguan_kelas (id, materi_id, pu_kelas_id) VALUES (lower(hex(randomblob(16))), ?, ?)`)
          .bind(id, pkId)
      )
      await db.batch(stmts)
    }

    revalidatePath(REVAL)
    return { success: 'Materi berhasil diperbarui' }
  } catch (e: any) {
    return { error: e.message || 'Gagal memperbarui materi' }
  }
}

export async function hapusMateriMingguan(id: string) {
  const db = await getDB()
  try {
    await db.prepare('DELETE FROM pu_materi_mingguan WHERE id = ?').bind(id).run()
    revalidatePath(REVAL)
    return { success: 'Materi berhasil dihapus' }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ============================================================
// 4. JADWAL SAMPLING MINGGUAN
//    Kapasitas harian = SUM of JAM_TO_SISWA[jam] tiap guru di kelas tsb
//    Semua siswa harus kebagian minimal 1× seminggu.
//    Jika siswa sedikit, beberapa bisa 2× untuk memenuhi kuota guru.
// ============================================================
const JAM_TO_SISWA: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5 }

export async function getDailyCapacity(kelasId: string): Promise<{ capacity: number; guruDetail: any[] }> {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { capacity: 0, guruDetail: [] }

  const result = await db.prepare(`
    SELECT pm.guru_id, u.nama_lengkap as guru_nama,
      COUNT(DISTINCT jm.id) as total_jam
    FROM penugasan_mengajar pm
    JOIN "user" u ON pm.guru_id = u.id
    LEFT JOIN jadwal_mengajar jm ON jm.penugasan_id = pm.id
    WHERE pm.kelas_id = ? AND pm.tahun_ajaran_id = ?
    GROUP BY pm.guru_id, u.nama_lengkap
    ORDER BY u.nama_lengkap
  `).bind(kelasId, ta.id).all<any>()

  const guruDetail = (result.results || []).map((g: any) => {
    const jam = Math.min(Math.max(g.total_jam || 1, 1), 4)
    return { ...g, jam, kuota: JAM_TO_SISWA[jam] || 1 }
  })
  const capacity = guruDetail.reduce((sum: number, g: any) => sum + g.kuota, 0)
  return { capacity: Math.max(capacity, 1), guruDetail }
}

export async function generateJadwalSampling(puKelasId: string, mingguMulai: string): Promise<{ success?: string; error?: string; jadwal?: any[]; capacity?: number }> {
  const db = await getDB()
  try {
    const pk = await db.prepare('SELECT kelas_id FROM pu_kelas_unggulan WHERE id = ?').bind(puKelasId).first<any>()
    if (!pk) return { error: 'Kelas unggulan tidak ditemukan' }

    // Check existing
    const existing = await db.prepare(
      'SELECT id FROM pu_jadwal_sampling WHERE pu_kelas_id = ? AND minggu_mulai = ? LIMIT 1'
    ).bind(puKelasId, mingguMulai).first<any>()
    if (existing) return await getJadwalSampling(puKelasId, mingguMulai)

    // All active students
    const siswaRes = await db.prepare(`
      SELECT id as siswa_id, nama_lengkap FROM siswa WHERE kelas_id = ? AND status = 'aktif' ORDER BY nama_lengkap
    `).bind(pk.kelas_id).all<any>()
    const students = siswaRes.results || []
    if (students.length === 0) return { error: 'Tidak ada siswa aktif di kelas ini' }

    // Daily capacity = total kuota semua guru per hari
    const { capacity } = await getDailyCapacity(pk.kelas_id)
    const n = students.length

    // Shuffle students untuk distribusi acak
    const shuffled = [...students].sort(() => Math.random() - 0.5)

    // -------------------------------------------------------
    // Goal: setiap hari (1–6) selalu terisi tepat `capacity`
    // slot siswa agar setiap guru selalu ada siswa yang bisa
    // dites. Siswa BOLEH muncul di beberapa hari berbeda
    // -------------------------------------------------------
    const assignments: { siswa_id: string; hari: number }[] = []

    for (let day = 1; day <= 6; day++) {
      const daySet = new Set<string>()
      const offset = (day - 1) * capacity
      let added = 0
      let tries = 0

      while (added < capacity && tries < n) {
        const student = shuffled[(offset + tries) % n]
        if (!daySet.has(student.siswa_id)) {
          assignments.push({ siswa_id: student.siswa_id, hari: day })
          daySet.add(student.siswa_id)
          added++
        }
        tries++
      }

      // Fallback: jika capacity > n (lebih banyak slot dari siswa),
      // lanjut scan dari awal untuk mengisi sisa slot
      if (added < capacity) {
        for (let i = 0; i < n && added < capacity; i++) {
          const student = shuffled[i]
          if (!daySet.has(student.siswa_id)) {
            assignments.push({ siswa_id: student.siswa_id, hari: day })
            daySet.add(student.siswa_id)
            added++
          }
        }
      }
    }

    if (assignments.length === 0) return { error: 'Tidak dapat membuat jadwal: kapasitas tidak tersedia' }

    // Insert batch
    const stmts = assignments.map(a =>
      db.prepare(`INSERT INTO pu_jadwal_sampling (id, pu_kelas_id, siswa_id, minggu_mulai, hari) VALUES (lower(hex(randomblob(16))), ?, ?, ?, ?)`)
        .bind(puKelasId, a.siswa_id, mingguMulai, a.hari)
    )
    for (let i = 0; i < stmts.length; i += 50) {
      await db.batch(stmts.slice(i, i + 50))
    }

    revalidatePath(REVAL)
    return await getJadwalSampling(puKelasId, mingguMulai)
  } catch (e: any) {
    return { error: e.message || 'Gagal generate jadwal' }
  }
}

export async function getJadwalSampling(puKelasId: string, mingguMulai: string) {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT js.id, js.siswa_id, js.hari, s.nama_lengkap
    FROM pu_jadwal_sampling js
    JOIN siswa s ON js.siswa_id = s.id
    WHERE js.pu_kelas_id = ? AND js.minggu_mulai = ?
    ORDER BY js.hari, s.nama_lengkap
  `).bind(puKelasId, mingguMulai).all<any>()

  const pk = await db.prepare('SELECT kelas_id FROM pu_kelas_unggulan WHERE id = ?').bind(puKelasId).first<any>()
  let capacity = 0
  if (pk) { const c = await getDailyCapacity(pk.kelas_id); capacity = c.capacity }

  return { success: 'OK', jadwal: result.results || [], capacity }
}

export async function pindahHariSampling(jadwalId: string, hariBaru: number): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    await db.prepare('UPDATE pu_jadwal_sampling SET hari = ? WHERE id = ?').bind(hariBaru, jadwalId).run()
    revalidatePath(REVAL)
    return { success: 'Jadwal berhasil diubah' }
  } catch (e: any) {
    return { error: e.message }
  }
}

export async function resetJadwalSampling(puKelasId: string, mingguMulai: string): Promise<{ success?: string; error?: string }> {
  const db = await getDB()
  try {
    await db.prepare('DELETE FROM pu_jadwal_sampling WHERE pu_kelas_id = ? AND minggu_mulai = ?')
      .bind(puKelasId, mingguMulai).run()
    revalidatePath(REVAL)
    return { success: 'Jadwal berhasil direset. Generate ulang untuk acak baru.' }
  } catch (e: any) {
    return { error: e.message }
  }
}

// ============================================================
// 5. DROPDOWN DATA (tetap)
// ============================================================
export async function getAllKelasForDropdown() {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT id, tingkat, nomor_kelas, kelompok
    FROM kelas ORDER BY tingkat, CAST(nomor_kelas AS INTEGER), kelompok
  `).all<any>()
  return result.results || []
}

// ============================================================
// 6. MONITORING & LAPORAN (tetap dari existing)
// ============================================================
export async function getMonitoringData(puKelasId?: string, tanggalDari?: string, tanggalSampai?: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { guruActivity: [], siswaRekap: [] }

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
  siswaSql += ' GROUP BY s.id ORDER BY kelas_label, s.nama_lengkap'
  const siswaResult = await db.prepare(siswaSql).bind(...siswaParams).all<any>()

  return { guruActivity: guruResult.results || [], siswaRekap: siswaResult.results || [] }
}

export async function getLaporanData(puKelasId?: string, tanggalDari?: string, tanggalSampai?: string) {
  const monitoring = await getMonitoringData(puKelasId, tanggalDari, tanggalSampai)
  const db = await getDB()
  const ta = await db.prepare('SELECT nama, semester FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<any>()

  const guruMap = new Map<string, { nama: string; total_sesi: number; total_siswa: number; tanggal_set: Set<string> }>()
  for (const row of monitoring.guruActivity) {
    if (!guruMap.has(row.guru_id)) guruMap.set(row.guru_id, { nama: row.guru_nama, total_sesi: 0, total_siswa: 0, tanggal_set: new Set() })
    const g = guruMap.get(row.guru_id)!
    if (row.status === 'sudah') g.total_siswa++
    g.tanggal_set.add(row.tanggal)
  }
  for (const g of guruMap.values()) g.total_sesi = g.tanggal_set.size

  return {
    tahunAjaran: ta ? `${ta.nama} - Semester ${ta.semester}` : '-',
    guruActivity: monitoring.guruActivity,
    siswaRekap: monitoring.siswaRekap,
    guruSummary: Array.from(guruMap.entries()).map(([id, v]) => ({
      guru_id: id, guru_nama: v.nama, total_sesi: v.total_sesi, total_siswa_dites: v.total_siswa
    })).sort((a, b) => a.guru_nama.localeCompare(b.guru_nama))
  }
}
