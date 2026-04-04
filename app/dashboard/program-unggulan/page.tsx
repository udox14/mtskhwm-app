// Lokasi: app/dashboard/program-unggulan/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { getDB } from '@/utils/db'
import { checkFeatureAccess, getUserRoles } from '@/lib/features'
import { Star } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { TesClient } from './components/tes-client'
import { getKelasUnggulanGuru } from './actions'

export const metadata = { title: 'Program Unggulan - MTSKHWM App' }
export const dynamic = 'force-dynamic'

async function DataFetcher({ userId, namaLengkap }: { userId: string; namaLengkap: string }) {
  const { data, error } = await getKelasUnggulanGuru(userId)
  if (error) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <p className="text-sm">{error}</p>
      </div>
    )
  }
  return <TesClient kelasList={data} currentUser={{ id: userId, nama_lengkap: namaLengkap }} />
}

export default async function ProgramUnggulanPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = await getDB()
  const allowed = await checkFeatureAccess(db, user.id, 'program-unggulan')
  if (!allowed) redirect('/dashboard')

  const namaLengkap = (user as any).nama_lengkap ?? user.name ?? ''
  const userRoles = await getUserRoles(db, user.id)

  // Admin diarahkan ke panel kelola
  if (userRoles.some(r => ['super_admin', 'admin_tu', 'kepsek'].includes(r))) {
    // Admin bisa juga akses halaman tes, tapi redirect default ke kelola
    // Uncomment baris di bawah jika ingin redirect otomatis:
    // redirect('/dashboard/program-unggulan/kelola')
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12 max-w-lg mx-auto">
      <PageHeader
        title="Program Unggulan"
        description="Pengetesan siswa kelas unggulan"
        icon={Star}
        iconColor="text-amber-500"
      />
      <Suspense fallback={<PageLoading text="Memuat program unggulan..." />}>
        <DataFetcher userId={user.id} namaLengkap={namaLengkap} />
      </Suspense>
    </div>
  )
}
