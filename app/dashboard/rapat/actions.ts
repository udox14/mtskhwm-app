'use server'

import { getDB, dbInsert, dbUpdate } from '@/utils/db'
import { getCurrentUser } from '@/utils/auth/server'
import { revalidatePath } from 'next/cache'
import { getUserRoles } from '@/lib/features'
import { sendPushNotification } from '@/lib/web-push'
import { nowWIB } from '@/lib/time'

// 1. Buat Undangan Rapat
export async function buatUndanganRapat(
  prevState: any,
  formData: FormData
) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }
  const db = await getDB()
  
  const roles = await getUserRoles(db, user.id)
  if (!roles.some(r => ['super_admin', 'admin_tu', 'kepsek'].includes(r))) {
    return { error: 'Anda tidak memiliki akses untuk membuat undangan rapat.' }
  }

  const agenda = formData.get('agenda') as string
  const tanggal = formData.get('tanggal') as string
  const waktu = formData.get('waktu') as string
  const tempat = formData.get('tempat') as string
  const catatan = formData.get('catatan') as string
  const targetType = formData.get('targetType') as string
  const targetRole = formData.get('targetRole') as string

  if (!agenda || !tanggal || !waktu || !tempat) {
    return { error: 'Semua kolom wajib (Agenda, Tanggal, Waktu, Tempat) harus diisi.' }
  }

  // Ambil target user
  let targetUsers: any[] = []
  if (targetType === 'all') {
    targetUsers = (await db.prepare('SELECT id FROM "user" WHERE banned = 0 AND id != ?').bind(user.id).all()).results || []
  } else if (targetType === 'role' && targetRole) {
    targetUsers = (await db.prepare('SELECT id FROM "user" WHERE role = ? AND banned = 0 AND id != ?').bind(targetRole, user.id).all()).results || []
  }

  if (targetUsers.length === 0) {
    return { error: 'Tidak ada pengguna di target yang dipilih.' }
  }

  // Insert rapat
  const rapatInsert = await dbInsert<any>(db, 'undangan_rapat', {
    agenda,
    tanggal,
    waktu,
    tempat,
    catatan: catatan || null,
    pengundang_id: user.id
  })

  if (rapatInsert.error) return { error: rapatInsert.error }
  const rapatId = rapatInsert.data.id

  // Insert peserta
  const stmts = targetUsers.map(u => 
    db.prepare('INSERT INTO peserta_rapat (id, rapat_id, user_id) VALUES (lower(hex(randomblob(16))), ?, ?)')
      .bind(rapatId, u.id)
  )

  try {
    for (let i = 0; i < stmts.length; i += 100) {
      await db.batch(stmts.slice(i, i + 100))
    }
  } catch (e: any) {
    return { error: 'Gagal menambahkan peserta: ' + e.message }
  }

  // Kirim Push Notification ke Peserta
  try {
    let targetPush: any = targetType === 'all' ? { all: true } : { role: targetRole }
    
    await sendPushNotification(
      {
        title: 'Undangan Rapat Baru',
        body: `Agenda: ${agenda} pada ${tanggal} jam ${waktu} di ${tempat}. Harap konfirmasi kehadiran Anda.`,
        url: '/dashboard/rapat'
      },
      targetPush
    )
  } catch (e) {
    console.error('Gagal mengirim push notif rapat', e)
    // Non-blocking error
  }

  revalidatePath('/dashboard/rapat')
  return { success: `Undangan rapat berhasil dibuat dan dikirim ke ${targetUsers.length} pengguna.` }
}

// 2. Konfirmasi Kehadiran
export async function konfirmasiKehadiran(
  pesertaId: string,
  status: 'HADIR' | 'TIDAK_HADIR',
  alasan: string = ''
) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }

  const db = await getDB()
  
  // Verify ownership
  const cek = await db.prepare('SELECT id FROM peserta_rapat WHERE id = ? AND user_id = ?').bind(pesertaId, user.id).first()
  if (!cek) return { error: 'Data peserta tidak valid atau bukan milik Anda.' }

  await dbUpdate(db, 'peserta_rapat', {
    status_kehadiran: status,
    alasan_tidak_hadir: alasan || null,
    waktu_respon: nowWIB().toISOString()
  }, { id: pesertaId })

  revalidatePath('/dashboard/rapat')
  return { success: 'Konfirmasi kehadiran berhasil disimpan.' }
}
