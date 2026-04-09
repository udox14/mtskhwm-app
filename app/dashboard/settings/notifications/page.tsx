import { getCurrentUser } from '@/utils/auth/server';
import { redirect } from 'next/navigation';
import { NotificationClient } from './components/NotificationClient';

export default async function AdminNotificationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    redirect('/dashboard');
  }

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

      <NotificationClient />
    </div>
  );
}
