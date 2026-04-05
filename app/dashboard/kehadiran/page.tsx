// Lokasi: app/dashboard/kehadiran/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { getDB } from '@/utils/db'
import { checkFeatureAccess, getUserRoles } from '@/lib/features'
import { CalendarCheck } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { AbsensiClient } from './components/absensi-client'
import { getBlokMengajarHariIni } from './actions'
import { getEffectiveUser, getActAsUserList } from '@/lib/act-as'
import { ActAsBanner } from '@/components/layout/act-as-banner'

export const metadata = { title: 'Absensi Siswa - MTSKHWM App' }

async function AbsensiFetcher({ effectiveUserId }: { effectiveUserId: string }) {
  const data = await getBlokMengajarHariIni(effectiveUserId)
  return <AbsensiClient initialData={data} />
}

export const dynamic = 'force-dynamic'
export default async function KehadiranPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = await getDB()
  const allowed = await checkFeatureAccess(db, user.id, 'kehadiran')
  if (!allowed) redirect('/dashboard')

  // Check super admin untuk fitur Act As
  const userRoles = await getUserRoles(db, user.id)
  const isSuperAdmin = userRoles.includes('super_admin')

  const effective = await getEffectiveUser()
  const effectiveUserId = effective?.effectiveUserId || user.id

  // Ambil daftar guru hanya jika super admin
  const actAsUsers = isSuperAdmin ? await getActAsUserList() : []

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <PageHeader
        title="Absensi Siswa"
        description="Absen siswa di kelas yang Anda ajar hari ini."
        icon={CalendarCheck}
        iconColor="text-emerald-500"
      />

      {/* Act As Banner — hanya untuk super admin */}
      {isSuperAdmin && (
        <ActAsBanner
          isActingAs={effective?.isActingAs || false}
          actAsName={effective?.actAsName || null}
          userList={actAsUsers}
          adminName={effective?.realUserName || 'Admin'}
        />
      )}

      <Suspense fallback={<PageLoading text="Memuat jadwal mengajar..." />}>
        <AbsensiFetcher effectiveUserId={effectiveUserId} />
      </Suspense>
    </div>
  )
}
