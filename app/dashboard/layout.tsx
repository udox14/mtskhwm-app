// Lokasi: app/dashboard/layout.tsx
import { redirect } from 'next/navigation'
import { getSession } from '@/utils/auth/server'
import { getDB } from '@/utils/db'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { getUserAllowedFeatures, getUserRoles, getPrimaryRole } from '@/lib/features'

export const metadata = {
  title: 'Dashboard - MSS',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  if (!session?.user) {
    redirect('/login')
  }

  const user = session.user

  const db = await getDB()

  // Query semua data user sekaligus (parallel)
  const [freshUser, userRoles, allowedFeatures] = await Promise.all([
    db.prepare(
      'SELECT nama_lengkap, role, avatar_url FROM "user" WHERE id = ?'
    ).bind(user.id).first<any>(),
    getUserRoles(db, user.id),
    getUserAllowedFeatures(db, user.id),
  ])

  const primaryRole = freshUser?.role || (user as any).role || 'guru'
  const userName = freshUser?.nama_lengkap || (user as any).nama_lengkap || user.name || 'User MSS'
  const avatarUrl = freshUser?.avatar_url || null

  return (
    <div className="flex h-[100dvh] w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      <Sidebar
        userRoles={userRoles}
        primaryRole={primaryRole}
        userName={userName}
        allowedFeatures={allowedFeatures}
      />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Header
          userRoles={userRoles}
          primaryRole={primaryRole}
          userName={userName}
          userEmail={user.email || ''}
          avatarUrl={avatarUrl}
        />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-5">
          <div className="mx-auto max-w-7xl pb-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}