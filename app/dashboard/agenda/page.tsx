// Lokasi: app/dashboard/agenda/page.tsx
import { Suspense } from 'react'
import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { getDB } from '@/utils/db'
import { checkFeatureAccess, getPrimaryRole, getUserRoles } from '@/lib/features'
import { ClipboardPen } from 'lucide-react'
import { PageLoading } from '@/components/layout/page-loading'
import { PageHeader } from '@/components/layout/page-header'
import { AgendaClient } from './components/agenda-client'
import { getJadwalGuruHariIni } from './actions'
import { getEffectiveUser, getActAsUserList, getActAsDate } from '@/lib/act-as'
import { ActAsBanner } from '@/components/layout/act-as-banner'

export const metadata = { title: 'Agenda Guru - MTSKHWM App' }

async function AgendaDataFetcher({ effectiveUserId, role, isActingAs, dateOverride }: { effectiveUserId: string; role: string; isActingAs: boolean; dateOverride?: string }) {
  const result = await getJadwalGuruHariIni(effectiveUserId, dateOverride)
  return <AgendaClient initialData={result} userRole={role} isActingAs={isActingAs} />
}

export const dynamic = 'force-dynamic'
export default async function AgendaPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const db = await getDB()
  const allowed = await checkFeatureAccess(db, user.id, 'agenda')
  if (!allowed) redirect('/dashboard')

  const role = await getPrimaryRole(db, user.id)

  // Check super admin untuk fitur Act As
  const userRoles = await getUserRoles(db, user.id)
  const isSuperAdmin = userRoles.includes('super_admin')

  const effective = await getEffectiveUser()
  const effectiveUserId = effective?.effectiveUserId || user.id
  const isActingAs = effective?.isActingAs || false

  // Tanggal override (hanya berlaku saat act-as)
  const actAsDate = (isSuperAdmin && isActingAs) ? await getActAsDate() : null

  // Ambil daftar guru hanya jika super admin
  const actAsUsers = isSuperAdmin ? await getActAsUserList() : []

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Agenda Guru"
        description="Isi agenda mengajar sesuai jadwal pelajaran Anda hari ini."
        icon={ClipboardPen}
        iconColor="text-emerald-500"
      />

      {/* Act As Banner — hanya untuk super admin */}
      {isSuperAdmin && (
        <ActAsBanner
          isActingAs={isActingAs}
          actAsName={effective?.actAsName || null}
          userList={actAsUsers}
          adminName={effective?.realUserName || 'Admin'}
          actAsDate={actAsDate}
          showDatePicker={true}
        />
      )}

      <Suspense fallback={<PageLoading text="Memuat jadwal hari ini..." />}>
        <AgendaDataFetcher effectiveUserId={effectiveUserId} role={role} isActingAs={isActingAs} dateOverride={actAsDate ?? undefined} />
      </Suspense>
    </div>
  )
}
