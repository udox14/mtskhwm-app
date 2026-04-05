// lib/act-as-actions.ts
'use server'

import { cookies } from 'next/headers'
import { getCurrentUser } from '@/utils/auth/server'
import { isSuperAdmin, ACT_AS_COOKIE } from '@/lib/act-as'
import { revalidatePath } from 'next/cache'

/**
 * Set act-as cookie (super admin pilih guru target)
 */
export async function setActAsUser(targetUserId: string): Promise<{ error?: string }> {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }

  const isAdmin = await isSuperAdmin(user.id)
  if (!isAdmin) return { error: 'Hanya super admin yang bisa menggunakan fitur ini.' }

  const cookieStore = await cookies()
  cookieStore.set(ACT_AS_COOKIE, targetUserId, {
    path: '/',
    maxAge: 60 * 60 * 8, // 8 jam
    httpOnly: true,
    sameSite: 'lax',
  })

  revalidatePath('/dashboard/kehadiran')
  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/program-unggulan')

  return {}
}

/**
 * Clear act-as cookie (kembali ke akun sendiri)
 */
export async function clearActAs(): Promise<{ error?: string }> {
  const cookieStore = await cookies()
  cookieStore.delete(ACT_AS_COOKIE)

  revalidatePath('/dashboard/kehadiran')
  revalidatePath('/dashboard/agenda')
  revalidatePath('/dashboard/program-unggulan')

  return {}
}
