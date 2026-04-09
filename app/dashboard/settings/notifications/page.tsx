import { getCurrentUser } from '@/utils/auth/server';
import { redirect } from 'next/navigation';
import { NotificationClient } from './components/NotificationClient';
import { checkFeatureAccess } from '@/lib/features';
import { getDB } from '@/utils/db';
import { ALL_ROLES } from '@/config/menu';

export const dynamic = 'force-dynamic'

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const db = await getDB();
  const allowed = await checkFeatureAccess(db, user.id, 'settings-notifications');
  
  if (!allowed) {
    redirect('/dashboard');
  }

  // DIAGNOSTIK: Ambil detail langganan dan mapping user/role
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

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-1">
          Pusat Notifikasi (Admin)
        </h1>
        <p className="text-sm text-slate-500">
          Kirim pemberitahuan push langsung ke perangkat pengguna (Broadcasting).
        </p>
      </div>

      <NotificationClient 
        roles={[...ALL_ROLES]} 
        diagnostics={{
          totalDevices: deviceDetails.results?.length || 0,
          deviceList: deviceDetails.results || [],
          vapidKey: vapidKey
        }}
      />
    </div>
  );
}
