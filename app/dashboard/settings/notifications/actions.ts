'use server'

import { getCurrentUser } from '@/utils/auth/server'
import { sendPushNotification } from '@/lib/web-push'
import { checkFeatureAccess } from '@/lib/features'
import { getDB } from '@/utils/db'

export async function sendCustomNotification(
  prevState: any,
  formData: FormData
) {
  const user = await getCurrentUser()
  if (!user) return { error: 'Unauthorized' }

  const db = await getDB()
  const allowed = await checkFeatureAccess(db, user.id, 'settings-notifications')
  
  if (!allowed) {
    return { error: 'Anda tidak memiliki hak akses untuk mengirim notifikasi broadcast.' }
  }

  const title = formData.get('title') as string
  const body = formData.get('body') as string
  const url = (formData.get('url') as string) || '/'
  const targetType = formData.get('targetType') as string // 'all', 'role'
  const targetRole = formData.get('targetRole') as string

  if (!title || !body) {
    return { error: 'Judul dan Konten tidak boleh kosong.' }
  }

  let target: any = {}
  if (targetType === 'all') {
    target.all = true
  } else if (targetType === 'role') {
    if (!targetRole) return { error: 'Pilih role penerima.' }
    target.role = targetRole
  } else {
    return { error: 'Target tidak valid.' }
  }

  try {
    const act = await sendPushNotification(
      { title, body, url },
      target
    )

    if (act.success) {
      return { success: `Notifikasi berhasil dikirim ke ${act.sent} perangkat.` }
    } else {
      return { error: 'Terjadi kesalahan sistem saat mengirim: ' + act.message }
    }
  } catch (error: any) {
    return { error: error.message }
  }
}
