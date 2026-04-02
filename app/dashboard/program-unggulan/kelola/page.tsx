// Lokasi: app/dashboard/program-unggulan/kelola/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { Star } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { AdminClient } from './components/admin-client'
import { getKelasUnggulanAdmin, getAllKelasForDropdown, getAllGuruForDropdown } from './actions'

export const metadata = { title: 'Kelola Program Unggulan - MTSKHWM App' }
export const dynamic = 'force-dynamic'

async function DataFetcher() {
  const [kelasRes, allKelas, allGuru] = await Promise.all([
    getKelasUnggulanAdmin(),
    getAllKelasForDropdown(),
    getAllGuruForDropdown()
  ])

  return (
    <AdminClient
      initialKelas={kelasRes.data || []}
      allKelas={allKelas}
      allGuru={allGuru}
    />
  )
}

export default async function KelolaPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const role = (user as any).role ?? 'guru'
  if (!['super_admin', 'admin_tu', 'kepsek', 'wakamad'].includes(role)) {
    redirect('/dashboard/program-unggulan')
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Kelola Program Unggulan"
        description="Atur kelas unggulan, assign guru, kelola materi, dan pantau pengetesan"
        icon={Star}
        iconColor="text-amber-500"
      />
      <Suspense fallback={<PageLoading text="Memuat panel kelola..." />}>
        <DataFetcher />
      </Suspense>
    </div>
  )
}
