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
      conditions.push(`LOWER(user_id) = LOWER(?)`);
      bindings.push(target.userId);
    } else if (target.role) {
      // Jika filter role, kita harus JOIN ke user dengan case-insensitive
      query = `
        SELECT wp.endpoint, wp.p256dh, wp.auth 
        FROM web_push_subscriptions wp
        JOIN "user" u ON wp.user_id = u.id
        WHERE (u.id IN (SELECT user_id FROM user_roles WHERE LOWER(role) = LOWER(?)) OR LOWER(u.role) = LOWER(?))
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

    console.log(`[PushService] SQL:`, query);
    console.log(`[PushService] BINDINGS:`, bindings);
    
    const dbResult = await db.prepare(query).bind(...bindings).all();
    console.log(`[PushService] Raw DB Result:`, JSON.stringify(dbResult));

    // Robust parsing (handles both {results:[]} and directly [])
    const results = (Array.isArray(dbResult) ? dbResult : (dbResult as any).results || []) as any[];
    console.log(`[PushService] Parsed Results Count: ${results.length}`);

    if (results.length === 0) {
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
        console.log(`[PushService] Sending to endpoint: ...${row.endpoint.slice(-20)}`);
        
        if (!publicVapidKey || !privateVapidKey) {
          throw new Error('VAPID keys are missing at runtime - check your .env');
        }

        await webpush.sendNotification(pushSubscription, payload);
        console.log(`[PushService] ✅ Successfully sent to ...${row.endpoint.slice(-20)}`);
        return { success: true, endpoint: row.endpoint };
      } catch (err: any) {
        console.error(`[PushService] ❌ Failed to send to ...${row.endpoint.slice(-20)}:`, err.message);
        if (err.statusCode) console.error(`[PushService] HTTP Status Error: ${err.statusCode}`);
        
        // Jika 410 Gone atau 404 Not Found, berarti subscription expired/unsubscribed
        if (err.statusCode === 410 || err.statusCode === 404) {
          console.warn(`[PushService] Subscription expired, removing from DB.`);
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
