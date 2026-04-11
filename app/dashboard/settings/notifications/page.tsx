import { getCurrentUser } from '@/utils/auth/server';
import { redirect } from 'next/navigation';
import { NotificationClient } from './components/NotificationClient';
import { checkFeatureAccess } from '@/lib/features';
import { getDB } from '@/utils/db';
import { ALL_ROLES } from '@/config/menu';
import { PageHeader } from '@/components/layout/page-header';
import { getAllUsersForCheckbox } from '@/app/dashboard/rapat/actions';

export const dynamic = 'force-dynamic'

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = await getDB();
  const allowed = await checkFeatureAccess(db, user.id, 'settings-notifications');
  
  if (!allowed) {
    redirect('/dashboard');
  }

  // Diagnostik
  const deviceDetails = await db.prepare(`
    SELECT 
      wp.endpoint, 
      u.nama_lengkap, 
      u.role as primary_role,
      (SELECT GROUP_CONCAT(role) FROM user_roles WHERE user_id = u.id) as secondary_roles
    FROM web_push_subscriptions wp
    LEFT JOIN "user" u ON wp.user_id = u.id
    LIMIT 5
  `).all<any>();

  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || 'N/A';
  const allUsers = await getAllUsersForCheckbox();

  return (
    <div className="space-y-4 animate-in fade-in duration-500 pb-12">
      <PageHeader
        title="Pusat Notifikasi (Admin)"
        description="Kirim pemberitahuan push langsung ke perangkat pengguna (Broadcasting)."
      />

      <NotificationClient 
        roles={[...ALL_ROLES]}
        allUsers={allUsers}
        diagnostics={{
          totalDevices: deviceDetails.results?.length || 0,
          deviceList: deviceDetails.results || [],
          vapidKey: vapidKey
        }}
      />
    </div>
  );
}
