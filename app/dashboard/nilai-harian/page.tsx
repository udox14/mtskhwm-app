import { getCurrentUser } from '@/utils/auth/server'
import { redirect } from 'next/navigation'
import { PageHeader } from '@/components/layout/page-header'
import { getPenugasanGuru } from './actions'
import { NilaiHarianClient } from './components/NilaiHarianClient'

export const dynamic = 'force-dynamic'

export default async function NilaiHarianPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  // Semua role guru & admin bisa akses — bukan fitur terbatas
  const penugasanList = await getPenugasanGuru()

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Input Nilai Harian"
        description="Kelola nilai harian siswa per mata pelajaran dan kelas yang Anda ampu."
      />
      <NilaiHarianClient penugasanList={penugasanList} />
    </div>
  )
}
