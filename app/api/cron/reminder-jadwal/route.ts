import { NextRequest, NextResponse } from 'next/server';
import { getDB } from '@/utils/db';
import { sendPushNotification } from '@/lib/web-push';
import { nowWIB } from '@/lib/time';

// Endpoint ini akan dipanggil oleh Cloudflare Cron Triggers setiap hari jam 06:30 WIB
// Anda perlu mendaftarkannya di wrangler.toml atau via Dashboard CF

export async function GET(req: NextRequest) {
  // Simple Authorization Check untuk Cron Route
  const authHeader = req.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'mtskhwm-cron'}`) {
    // Sebagai fallback, Cloudflare biasa passing header cf-cron
    // tetapi best practicenya tetap pakai CRON_SECRET token
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const db = await getDB();
    const today = nowWIB();
    let hariIni = today.getDay();
    if (hariIni === 0) hariIni = 7; // Minggu = 7

    // Ambil tahun ajaran aktif
    const ta = await db.prepare('SELECT id FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<any>();
    if (!ta) return NextResponse.json({ message: 'Tidak ada tahun ajaran aktif' });

    // Cari tahu siapa saja Guru yang ada jadwal mengajar pada hari ini (distinct)
    const { results } = await db.prepare(`
      SELECT DISTINCT pm.guru_id
      FROM jadwal_mengajar jm
      JOIN penugasan_mengajar pm ON jm.penugasan_id = pm.id
      WHERE jm.hari = ? AND jm.tahun_ajaran_id = ?
    `).bind(hariIni, ta.id).all<any>();

    if (!results || results.length === 0) {
      return NextResponse.json({ message: 'Tidak ada jadwal mengajar hari ini' });
    }

    const guruIds = results.map(r => r.guru_id);
    let sentCount = 0;

    // Kirim notifikasi ke masing-masing guru
    // Untuk efisiensi bisa diloop, tapi jika banyak bisa pakai Promise.all
    for (const guruId of guruIds) {
      // Tunggu pelan2 untuk hindari threshold push
      const act = await sendPushNotification(
        {
          title: 'Pengingat Jadwal Mengajar',
          body: `Selamat pagi! Anda memiliki jadwal mengajar hari ini. Silakan periksa dashboard untuk rincian kelas.`,
          url: '/dashboard/jadwal-mengajar'
        },
        { userId: guruId }
      );
      if (act.success) sentCount += act.sent;
    }

    return NextResponse.json({ 
      success: true, 
      date: today.toISOString(), 
      notifiedUsers: guruIds.length,
      devicesSent: sentCount
    });

  } catch (error: any) {
    console.error("Cron Reminder Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
