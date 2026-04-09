import webpush from 'web-push';
import { getDB } from '@/utils/db';

const publicVapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateVapidKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT || 'mailto:admin@localhost';

if (publicVapidKey && privateVapidKey) {
  webpush.setVapidDetails(
    subject,
    publicVapidKey,
    privateVapidKey
  );
} else {
  console.warn("VAPID keys not configured, Web Push will not work.");
}

type PushTarget = { userId?: string, role?: string, all?: boolean };

/**
 * Mengirim push notification ke user
 * @param notification Payload (title, body, url, dll)
 * @param target User spesifik atau kumpulan user berdasar role
 */
export async function sendPushNotification(
  notification: { title: string, body: string, url?: string, icon?: string },
  target: PushTarget
) {
  try {
    const db = await getDB();
    // Query dasar: kita hanya butuh endpoint dan keys
    let query = `SELECT endpoint, p256dh, auth FROM web_push_subscriptions`;
    let bindings: any[] = [];
    let conditions: string[] = [];

    if (target.userId) {
      conditions.push(`user_id = ?`);
      bindings.push(target.userId);
    } else if (target.role) {
      // Jika filter role, kita harus JOIN ke user
      query = `
        SELECT wp.endpoint, wp.p256dh, wp.auth 
        FROM web_push_subscriptions wp
        JOIN "user" u ON wp.user_id = u.id
        WHERE (u.id IN (SELECT user_id FROM user_roles WHERE role = ?) OR u.role = ?)
      `;
      bindings.push(target.role, target.role);
    } else if (target.all) {
      // Tidak butuh filter tambahan
    } else {
      return { success: false, message: "No target specified" };
    }

    if (conditions.length > 0) {
      query += ` WHERE ` + conditions.join(' AND ');
    }

    console.log(`[PushService] Running query for target:`, target);
    const { results } = await db.prepare(query).bind(...bindings).all();
    console.log(`[PushService] Found ${results?.length || 0} subscriptions in DB.`);

    if (!results || results.length === 0) {
      return { success: true, sent: 0, message: "No active subscriptions found for target" };
    }

    const payload = JSON.stringify(notification);
    
    // Kirim secara paralel
    const promises = results.map(async (row: any) => {
      const pushSubscription = {
        endpoint: row.endpoint,
        keys: {
          p256dh: row.p256dh,
          auth: row.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        return { success: true, endpoint: row.endpoint };
      } catch (err: any) {
        // Jika 410 Gone atau 404 Not Found, berarti subscription expired/unsubscribed
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Hapus dari DB
          await db.prepare('DELETE FROM web_push_subscriptions WHERE endpoint = ?')
            .bind(row.endpoint)
            .run();
        }
        return { success: false, endpoint: row.endpoint, error: err.message };
      }
    });

    const report = await Promise.all(promises);
    const sent = report.filter(r => r.success).length;

    return { success: true, sent, report };
  } catch (error) {
    console.error("Failed to send push notification:", error);
    return { success: false, error };
  }
}
