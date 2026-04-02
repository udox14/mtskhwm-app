// Lokasi: app/dashboard/rekap-absensi/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { BarChart3 } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { RekapAbsensiClient } from './components/rekap-client'
import { getRekapFilterOptions } from './actions'

export const metadata = { title: 'Rekap Absensi - MTSKHWM App' }

async function RekapFetcher() {
  const opts = await getRekapFilterOptions()
  return <RekapAbsensiClient filterOptions={opts} />
}

export const dynamic = 'force-dynamic'
export default async function RekapAbsensiPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  const role = (user as any).role ?? 'guru'
  const allowed = ['super_admin', 'admin_tu', 'kepsek', 'wakamad', 'wali_kelas']
  if (!allowed.includes(role)) redirect('/dashboard')

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Rekap Absensi Siswa"
        description="Monitoring kehadiran siswa per kelas, per siswa, dan per jam pelajaran."
        icon={BarChart3}
        iconColor="text-indigo-500"
      />
      <Suspense fallback={<PageLoading text="Menyiapkan data rekap..." />}>
        <RekapFetcher />
      </Suspense>
    </div>
  )
}
