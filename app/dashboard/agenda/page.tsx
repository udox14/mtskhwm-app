// Lokasi: app/dashboard/agenda/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { getDB } from '@/utils/db'
import { checkFeatureAccess, getPrimaryRole } from '@/lib/features'
import { ClipboardPen } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { AgendaClient } from './components/agenda-client'
import { getJadwalGuruHariIni } from './actions'

export const metadata = { title: 'Agenda Guru - MTSKHWM App' }

async function AgendaDataFetcher({ userId, role }: { userId: string; role: string }) {
  const result = await getJadwalGuruHariIni()
  return <AgendaClient initialData={result} userRole={role} />
}

export const dynamic = 'force-dynamic'
export default async function AgendaPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = await getDB()
  const allowed = await checkFeatureAccess(db, user.id, 'agenda')
  if (!allowed) redirect('/dashboard')

  const role = await getPrimaryRole(db, user.id)

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Agenda Guru"
        description="Isi agenda mengajar sesuai jadwal pelajaran Anda hari ini."
        icon={ClipboardPen}
        iconColor="text-emerald-500"
      />
      <Suspense fallback={<PageLoading text="Memuat jadwal hari ini..." />}>
        <AgendaDataFetcher userId={user.id} role={role} />
      </Suspense>
    </div>
  )
}
