// Lokasi: app/dashboard/program-unggulan/actions.ts
'use server'

import { getDB } from '@/utils/db'
import { revalidatePath } from 'next/cache'
import { todayWIB } from '@/lib/time'

// ============================================================
// TYPES
// ============================================================
type PuKelasGuru = {
  pu_kelas_id: string
  kelas_id: string
  tingkat: number
  nomor_kelas: string
  kelompok: string
  jam_mengajar: number
  pu_guru_kelas_id: string
}

type SiswaToTest = {
  hasil_id: string
  siswa_id: string
  nama_lengkap: string
  foto_url: string | null
  status: string
  nilai: string | null
}

// Mapping jam mengajar → jumlah siswa dites
const JAM_TO_SISWA: Record<number, number> = { 1: 1, 2: 3, 3: 4, 4: 5 }

// ============================================================
// 1. GET KELAS UNGGULAN UNTUK GURU
// ============================================================
export async function getKelasUnggulanGuru(guruId: string) {
  const db = await getDB()
  const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<{ id: string }>()
  if (!ta) return { data: [], error: 'Tahun ajaran aktif belum diatur' }

  const result = await db.prepare(`
    SELECT
      pk.id       AS pu_kelas_id,
      k.id        AS kelas_id,
      k.tingkat, k.nomor_kelas, k.kelompok,
      pg.jam_mengajar,
      pg.id       AS pu_guru_kelas_id
    FROM pu_guru_kelas pg
    JOIN pu_kelas_unggulan pk ON pg.pu_kelas_id = pk.id
    JOIN kelas k ON pk.kelas_id = k.id
    WHERE pg.guru_id = ? AND pk.tahun_ajaran_id = ?
    ORDER BY k.tingkat, k.kelompok, k.nomor_kelas
  `).bind(guruId, ta.id).all<PuKelasGuru>()

  return { data: result.results || [], error: null }
}

// ============================================================
// 2. GET / GENERATE DAFTAR SISWA TES HARI INI
//    Queue round-robin: siswa dgn tes selesai paling sedikit diprioritaskan
//    Sharing antar guru: siswa yg sudah di-assign hari ini oleh guru lain di-exclude
// ============================================================
export async function getSiswaTesList(puKelasId: string, guruId: string, jamMengajar: number) {
  const db = await getDB()
  const today = todayWIB()
  const jumlahSiswa = JAM_TO_SISWA[jamMengajar] ?? 3

  // Cek apakah sudah ada assignment untuk guru ini hari ini di kelas ini
  const existing = await db.prepare(`
    SELECT ht.id AS hasil_id, ht.siswa_id, s.nama_lengkap, s.foto_url, ht.status, ht.nilai
    FROM pu_hasil_tes ht
    JOIN siswa s ON ht.siswa_id = s.id
    WHERE ht.pu_kelas_id = ? AND ht.guru_id = ? AND ht.tanggal = ?
    ORDER BY s.nama_lengkap
  `).bind(puKelasId, guruId, today).all<SiswaToTest>()

  if (existing.results && existing.results.length > 0) {
    return { data: existing.results, isNew: false, error: null }
  }

  // Belum ada → generate baru
  // 1. Ambil kelas_id dari pu_kelas_unggulan
  const puKelas = await db.prepare('SELECT kelas_id FROM pu_kelas_unggulan WHERE id = ?').bind(puKelasId).first<{ kelas_id: string }>()
  if (!puKelas) return { data: [], isNew: false, error: 'Kelas unggulan tidak ditemukan' }

  // 2. Semua siswa aktif di kelas ini
  const allSiswa = await db.prepare(`
    SELECT id AS siswa_id, nama_lengkap, foto_url
    FROM siswa WHERE kelas_id = ? AND status = 'aktif'
  `).bind(puKelas.kelas_id).all<{ siswa_id: string; nama_lengkap: string; foto_url: string | null }>()
  const students = allSiswa.results || []
  if (students.length === 0) return { data: [], isNew: false, error: 'Tidak ada siswa aktif di kelas ini' }

  // 3. Hitung tes selesai per siswa di kelas ini (status='sudah')
  const completedCounts = await db.prepare(`
    SELECT siswa_id, COUNT(*) AS cnt
    FROM pu_hasil_tes
    WHERE pu_kelas_id = ? AND status = 'sudah'
    GROUP BY siswa_id
  `).bind(puKelasId).all<{ siswa_id: string; cnt: number }>()
  const countMap = new Map((completedCounts.results || []).map(r => [r.siswa_id, r.cnt]))

  // 4. Siswa yang sudah di-assign hari ini (oleh guru manapun)
  const todayAssigned = await db.prepare(`
    SELECT siswa_id FROM pu_hasil_tes
    WHERE pu_kelas_id = ? AND tanggal = ?
  `).bind(puKelasId, today).all<{ siswa_id: string }>()
  const todaySet = new Set((todayAssigned.results || []).map(r => r.siswa_id))

  // 5. Cari min completed count
  const studentCounts = students.map(s => ({
    ...s,
    completed: countMap.get(s.siswa_id) || 0
  }))
  const minCompleted = Math.min(...studentCounts.map(s => s.completed))

  // 6. Queue = siswa dgn completed == minCompleted, belum di-assign hari ini
  let queue = studentCounts.filter(s => s.completed === minCompleted && !todaySet.has(s.siswa_id))

  // Jika queue kurang, ambil dari round berikutnya
  if (queue.length < jumlahSiswa) {
    const nextQueue = studentCounts
      .filter(s => s.completed === minCompleted + 1 && !todaySet.has(s.siswa_id))
    queue = [...queue, ...nextQueue]
  }

  // Jika masih kurang, ambil siapapun yg belum di-assign hari ini
  if (queue.length < jumlahSiswa) {
    const remaining = studentCounts
      .filter(s => !todaySet.has(s.siswa_id) && !queue.find(q => q.siswa_id === s.siswa_id))
      .sort((a, b) => a.completed - b.completed)
    queue = [...queue, ...remaining]
  }

  if (queue.length === 0) {
    return { data: [], isNew: false, error: 'Semua siswa sudah di-assign tes hari ini' }
  }

  // 7. Shuffle & take
  const shuffled = queue.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, Math.min(jumlahSiswa, shuffled.length))
  const roundNumber = minCompleted + 1

  // 8. Batch insert ke pu_hasil_tes
  const stmts = selected.map(s =>
    db.prepare(`
      INSERT INTO pu_hasil_tes (pu_kelas_id, siswa_id, guru_id, tanggal, status, round_number)
      VALUES (?, ?, ?, ?, 'belum', ?)
    `).bind(puKelasId, s.siswa_id, guruId, today, roundNumber)
  )
  await db.batch(stmts)

  // 9. Ambil hasil yg baru diinsert
  const newResult = await db.prepare(`
    SELECT ht.id AS hasil_id, ht.siswa_id, s.nama_lengkap, s.foto_url, ht.status, ht.nilai
    FROM pu_hasil_tes ht
    JOIN siswa s ON ht.siswa_id = s.id
    WHERE ht.pu_kelas_id = ? AND ht.guru_id = ? AND ht.tanggal = ?
    ORDER BY s.nama_lengkap
  `).bind(puKelasId, guruId, today).all<SiswaToTest>()

  return { data: newResult.results || [], isNew: true, error: null }
}

// ============================================================
// 3. SIMPAN NILAI TES
// ============================================================
export async function simpanNilaiTes(hasilId: string, nilai: string) {
  const db = await getDB()
  try {
    await db.prepare(`
      UPDATE pu_hasil_tes SET nilai = ?, status = 'sudah', updated_at = datetime('now')
      WHERE id = ?
    `).bind(nilai, hasilId).run()
    revalidatePath('/dashboard/program-unggulan')
    return { success: true, error: null }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// 4. TANDAI TIDAK HADIR
// ============================================================
export async function tandaiTidakHadir(hasilId: string, statusAbsen: 'sakit' | 'izin' | 'alfa') {
  const db = await getDB()
  try {
    await db.prepare(`
      UPDATE pu_hasil_tes SET status = ?, nilai = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).bind(statusAbsen, hasilId).run()
    revalidatePath('/dashboard/program-unggulan')
    return { success: true, error: null }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// 5. RESET STATUS (kembali ke 'belum' jika salah input)
// ============================================================
export async function resetStatusTes(hasilId: string) {
  const db = await getDB()
  try {
    await db.prepare(`
      UPDATE pu_hasil_tes SET status = 'belum', nilai = NULL, updated_at = datetime('now')
      WHERE id = ?
    `).bind(hasilId).run()
    revalidatePath('/dashboard/program-unggulan')
    return { success: true, error: null }
  } catch (e: any) {
    return { success: false, error: e.message }
  }
}

// ============================================================
// 6. GET MATERI TES UNTUK KELAS
// ============================================================
export async function getMateriTes(puKelasId: string) {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT id, judul, konten, urutan
    FROM pu_materi
    WHERE pu_kelas_id = ? AND is_active = 1
    ORDER BY urutan ASC, created_at ASC
  `).bind(puKelasId).all<{ id: string; judul: string; konten: string; urutan: number }>()
  return result.results || []
}
