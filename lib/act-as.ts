// lib/act-as.ts
// Helper untuk fitur "Act As" — super admin bertindak atas nama guru lain
// Dipakai di kehadiran, agenda, program-unggulan

import { cookies } from 'next/headers'
import { getCurrentUser } from '@/utils/auth/server'
import { getDB } from '@/utils/db'
import { getUserRoles } from '@/lib/features'

export const ACT_AS_COOKIE = 'act-as-user-id'

/**
 * Cek apakah user saat ini adalah super_admin
 */
export async function isSuperAdmin(userId: string): Promise<boolean> {
  const db = await getDB()
  const roles = await getUserRoles(db, userId)
  return roles.includes('super_admin')
}

/**
 * Ambil effective user ID.
 * Jika super admin dan ada cookie act-as → return target user ID.
 * Jika tidak → return current user ID.
 * Returns: { realUserId, effectiveUserId, isActingAs, actAsName }
 */
export async function getEffectiveUser(): Promise<{
  realUserId: string
  effectiveUserId: string
  isActingAs: boolean
  actAsName: string | null
  realUserName: string
} | null> {
  const user = await getCurrentUser()
  if (!user) return null

  const realUserId = user.id
  const realUserName = (user as any).nama_lengkap || user.name || 'Admin'

  const cookieStore = await cookies()
  const actAsCookie = cookieStore.get(ACT_AS_COOKIE)

  if (!actAsCookie?.value) {
    return { realUserId, effectiveUserId: realUserId, isActingAs: false, actAsName: null, realUserName }
  }

  // Validasi: hanya super_admin yang boleh act-as
  const isAdmin = await isSuperAdmin(realUserId)
  if (!isAdmin) {
    return { realUserId, effectiveUserId: realUserId, isActingAs: false, actAsName: null, realUserName }
  }

  // Validasi: target user harus ada
  const db = await getDB()
  const targetUser = await db.prepare(
    'SELECT id, nama_lengkap FROM "user" WHERE id = ?'
  ).bind(actAsCookie.value).first<{ id: string; nama_lengkap: string }>()

  if (!targetUser) {
    return { realUserId, effectiveUserId: realUserId, isActingAs: false, actAsName: null, realUserName }
  }

  return {
    realUserId,
    effectiveUserId: targetUser.id,
    isActingAs: true,
    actAsName: targetUser.nama_lengkap,
    realUserName,
  }
}

/**
 * Ambil daftar guru/pegawai yang bisa di-act-as-kan
 * Mengembalikan semua user yang punya role guru/wali_kelas/guru_bk/guru_piket/guru_ppl
 */
export async function getActAsUserList(): Promise<Array<{ id: string; nama_lengkap: string; role: string }>> {
  const db = await getDB()
  const result = await db.prepare(`
    SELECT DISTINCT u.id, u.nama_lengkap, u.role
    FROM "user" u
    WHERE u.role IN ('guru', 'wali_kelas', 'guru_bk', 'guru_piket', 'guru_ppl', 'wakamad', 'kepsek')
    ORDER BY u.nama_lengkap ASC
  `).all<{ id: string; nama_lengkap: string; role: string }>()

  return result.results || []
}
