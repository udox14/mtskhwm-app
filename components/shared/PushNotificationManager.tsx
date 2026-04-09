'use client';

import { useState, useEffect } from 'react';
import { Bell, BellOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function PushNotificationManager() {
  const [isSupported, setIsSupported] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  async function checkSubscription() {
    try {
      const registration = await navigator.serviceWorker.ready;
      const sub = await registration.pushManager.getSubscription();
      setSubscription(sub);
    } catch (error) {
      console.error('Error checking push subscription:', error);
    } finally {
      setLoading(false);
    }
  }

  async function subscribeToPush() {
    try {
      setLoading(true);
      const registration = await navigator.serviceWorker.ready;
      
      const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicVapidKey) {
        throw new Error('VAPID public key not found');
      }

      // Base64Url to Uint8Array konversi
      const base64UrlToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
          .replace(/\-/g, '+')
          .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
          outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
      };

      const applicationServerKey = base64UrlToUint8Array(publicVapidKey);
      
      const sub = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: applicationServerKey
      });

      // Kirim sub ke server
      const response = await fetch('/api/web-push/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sub),
      });

      if (!response.ok) throw new Error('Gagal menyimpan ke server');

      setSubscription(sub);
    } catch (error) {
      console.error('Error subscribing to push:', error);
      alert('Gagal mengaktifkan notifikasi: ' + (error as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function unsubscribeFromPush() {
    try {
      setLoading(true);
      if (subscription) {
        // Hapus dari server
        await fetch('/api/web-push/register', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        });

        await subscription.unsubscribe();
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error unsubscribing:', error);
    } finally {
      setLoading(false);
    }
  }

  if (!isSupported) {
    return null; // Don't show if not supported (e.g. iOS standalone unsupported)
  }

  if (loading) {
    return (
      <Button variant="outline" size="sm" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Memuat...
      </Button>
    );
  }

  if (subscription) {
    return (
      <Button variant="outline" size="sm" onClick={unsubscribeFromPush} className="text-red-500 hover:text-red-600 hover:bg-red-50">
        <BellOff className="h-4 w-4 mr-2" />
        Matikan Notifikasi
      </Button>
    );
  } else {
    return (
      <Button variant="default" size="sm" onClick={subscribeToPush} className="bg-primary text-primary-foreground hover:bg-primary/90">
        <Bell className="h-4 w-4 mr-2" />
        Aktifkan Notifikasi
      </Button>
    );
  }
}
