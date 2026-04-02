// Lokasi: app/dashboard/kehadiran/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { CalendarCheck } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { AbsensiClient } from './components/absensi-client'
import { getBlokMengajarHariIni } from './actions'

export const metadata = { title: 'Absensi Siswa - MTSKHWM App' }

async function AbsensiFetcher() {
  const data = await getBlokMengajarHariIni()
  return <AbsensiClient initialData={data} />
}

export const dynamic = 'force-dynamic'
export default async function KehadiranPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-24">
      <PageHeader
        title="Absensi Siswa"
        description="Absen siswa di kelas yang Anda ajar hari ini."
        icon={CalendarCheck}
        iconColor="text-emerald-500"
      />
      <Suspense fallback={<PageLoading text="Memuat jadwal mengajar..." />}>
        <AbsensiFetcher />
      </Suspense>
    </div>
  )
}
