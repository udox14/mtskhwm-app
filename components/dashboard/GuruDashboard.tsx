// components/dashboard/GuruDashboard.tsx
import Link from 'next/link'
import { getDB } from '@/utils/db'
import { todayWIB } from '@/lib/time'
import { WelcomeStrip } from './shared/WelcomeStrip'
import { QuickLink } from './shared/QuickLink'
import { KehadiranPribadiCard } from './shared/KehadiranPribadiCard'
import {
  BookOpen, CheckCircle2, Clock, ClipboardPen,
  Send, Star, ArrowRight, AlertCircle,
} from 'lucide-react'

type Props = {
  userId: string; nama: string; namaDepan: string; avatarUrl: string | null
  roleLabel: string; roleColor: string; sapaan: string
  taAktif: { id?: string; nama: string; semester: number } | null
}

export async function GuruDashboard({ userId, nama, namaDepan, avatarUrl, roleLabel, roleColor, sapaan, taAktif }: Props) {
  const db = await getDB()
  const today = todayWIB()

  const d = new Date(today + 'T00:00:00')
  const hariIni = d.getDay() === 0 ? 7 : d.getDay()

  const taRow = await db.prepare('SELECT id, jam_pelajaran FROM tahun_ajaran WHERE is_active = 1 LIMIT 1').first<any>()
  const taId = taRow?.id

  const [jadwalRows, delegasiMasuk, unggulanRaw] = await Promise.all([
    taId ? db.prepare(`
      SELECT
        MIN(jm.jam_ke) as jam_mulai, MAX(jm.jam_ke) as jam_selesai,
        jm.penugasan_id,
        mp.nama_mapel,
        k.tingkat, k.nomor_kelas, k.kelompok,
        ag.id as agenda_id
      FROM jadwal_mengajar jm
      JOIN penugasan_mengajar pm ON jm.penugasan_id = pm.id
      JOIN mata_pelajaran mp ON pm.mapel_id = mp.id
      JOIN kelas k ON pm.kelas_id = k.id
      LEFT JOIN agenda_guru ag ON ag.penugasan_id = jm.penugasan_id AND ag.tanggal = ?
      WHERE jm.tahun_ajaran_id = ? AND jm.hari = ? AND pm.guru_id = ?
      GROUP BY jm.penugasan_id, mp.nama_mapel, k.tingkat, k.nomor_kelas, k.kelompok, ag.id
      ORDER BY jam_mulai ASC
    `).bind(today, taId, hariIni, userId).all<any>().then(r => r.results ?? []) : Promise.resolve([]),

    db.prepare(`
      SELECT COUNT(*) as cnt FROM delegasi_tugas
      WHERE kepada_user_id = ? AND tanggal = ?
    `).bind(userId, today).first<{ cnt: number }>(),

    db.prepare(`
      SELECT pu.nama_program, k.tingkat, k.nomor_kelas, k.kelompok
      FROM program_unggulan pu
      JOIN kelas k ON pu.kelas_id = k.id
      JOIN penugasan_mengajar pm ON pm.kelas_id = k.id AND pm.guru_id = ?
      WHERE pm.tahun_ajaran_id = ?
      GROUP BY pu.id
      LIMIT 3
    `).bind(userId, taId ?? '').all<any>().then(r => r.results ?? []).catch(() => []),
  ])

  // Parse jam dari pola jam pelajaran
  let slotsMap: Record<number, { mulai: string; selesai: string }> = {}
  try {
    const pola = JSON.parse(taRow?.jam_pelajaran || '[]')
    const hari = pola.find((p: any) => p.hari?.includes(hariIni))
    if (hari?.slots) {
      for (const s of hari.slots) {
        slotsMap[s.id] = { mulai: s.mulai, selesai: s.selesai }
      }
    }
  } catch {}

  const totalJadwal = jadwalRows.length
  const sudahIsiAgenda = jadwalRows.filter((j: any) => !!j.agenda_id).length
  const belumIsi = totalJadwal - sudahIsiAgenda
  const delegasiCnt = delegasiMasuk?.cnt ?? 0

  return (
    <div className="space-y-3 animate-in fade-in duration-500 pb-12">
      <WelcomeStrip nama={nama} namaDepan={namaDepan} avatarUrl={avatarUrl}
        roleLabel={roleLabel} roleColor={roleColor} taAktif={taAktif} sapaan={sapaan} />

      {/* Status Agenda + CTA */}
      <div className="rounded-xl border border-surface bg-surface shadow-sm overflow-hidden">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-2">
          <div className="p-1.5 rounded-md bg-emerald-50 border border-emerald-100">
            <ClipboardPen className="h-3.5 w-3.5 text-emerald-600" />
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Jadwal Mengajar Hari Ini</p>
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              {totalJadwal === 0 ? 'Tidak ada jadwal hari ini' : `${totalJadwal} kelas · ${sudahIsiAgenda} agenda terisi`}
            </p>
          </div>
          <Link href="/dashboard/agenda"
            className="shrink-0 inline-flex items-center gap-1.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-md transition-colors"
          >
            <ClipboardPen className="h-3 w-3" />
            Isi Jurnal
          </Link>
        </div>

        {totalJadwal === 0 ? (
          <div className="flex flex-col items-center justify-center gap-1.5 py-7 text-slate-400">
            <BookOpen className="h-6 w-6" />
            <p className="text-xs">Tidak ada jadwal mengajar hari ini</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
            {jadwalRows.map((j: any, i: number) => {
              const slotMulai   = slotsMap[j.jam_mulai]?.mulai   ?? '-'
              const slotSelesai = slotsMap[j.jam_selesai]?.selesai ?? '-'
              const filled = !!j.agenda_id
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2.5 ${filled ? '' : 'bg-amber-50/30 dark:bg-amber-900/10'}`}>
                  <div className={`h-8 w-8 shrink-0 rounded-lg flex items-center justify-center ${filled ? 'bg-emerald-50 dark:bg-emerald-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`}>
                    {filled
                      ? <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      : <AlertCircle className="h-4 w-4 text-amber-500" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{j.nama_mapel}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500">
                      Kelas {j.tingkat}{j.kelompok ?? ''}-{j.nomor_kelas}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-[10px] font-medium text-slate-600 dark:text-slate-300">{slotMulai}–{slotSelesai}</p>
                    <p className={`text-[9px] font-medium ${filled ? 'text-emerald-500' : 'text-amber-500'}`}>
                      {filled ? 'Terisi' : 'Belum isi'}
                    </p>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {belumIsi > 0 && (
          <div className="px-4 py-2 border-t border-amber-100 bg-amber-50/60 dark:bg-amber-900/10">
            <p className="text-[10px] text-amber-700 dark:text-amber-400">
              ⚠ {belumIsi} agenda belum terisi — segera isi sebelum berakhir hari ini!
            </p>
          </div>
        )}
      </div>

      {/* Penugasan Masuk + Program Unggulan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {/* Delegasi Masuk */}
        <div className="rounded-xl border border-surface bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-2">
            <div className="p-1.5 rounded-md bg-purple-50 border border-purple-100">
              <Send className="h-3.5 w-3.5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Penugasan Masuk</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Delegasi hari ini</p>
            </div>
            <Link href="/dashboard/penugasan" className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
              Kelola <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="flex flex-col items-center justify-center gap-1.5 py-6">
            <span className={`text-4xl font-bold tabular-nums ${delegasiCnt > 0 ? 'text-purple-600' : 'text-slate-300 dark:text-slate-700'}`}>
              {delegasiCnt}
            </span>
            <span className="text-[11px] text-slate-400 dark:text-slate-500">
              {delegasiCnt > 0 ? 'tugas diterima hari ini' : 'Tidak ada tugas hari ini'}
            </span>
          </div>
        </div>

        {/* Program Unggulan Kelas */}
        <div className="rounded-xl border border-surface bg-surface shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-2">
            <div className="p-1.5 rounded-md bg-amber-50 border border-amber-100">
              <Star className="h-3.5 w-3.5 text-amber-500" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Program Unggulan</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">Kelas yang diampu</p>
            </div>
            <Link href="/dashboard/program-unggulan" className="text-[11px] text-slate-400 hover:text-slate-600 flex items-center gap-1">
              Lihat <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          {unggulanRaw.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-6 text-slate-400">
              <Star className="h-5 w-5" />
              <p className="text-xs">Belum ada program unggulan</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
              {unggulanRaw.map((u: any, i: number) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <Star className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <p className="text-xs text-slate-700 dark:text-slate-200 flex-1 truncate">{u.nama_program}</p>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">Kls {u.tingkat}{u.kelompok ?? ''}-{u.nomor_kelas}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Links */}
      <div className="rounded-xl border border-surface bg-surface shadow-sm">
        <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-0.5">
          <QuickLink href="/dashboard/agenda"
            icon={<ClipboardPen className="h-4 w-4" />} iconBg="bg-emerald-50" iconColor="text-emerald-600"
            title="Isi Jurnal / Agenda" desc="Input kegiatan mengajar hari ini"
            badge={belumIsi > 0 ? belumIsi : undefined} badgeColor="bg-amber-100 text-amber-700" />
          <QuickLink href="/dashboard/kehadiran"
            icon={<CheckCircle2 className="h-4 w-4" />} iconBg="bg-blue-50" iconColor="text-blue-600"
            title="Absensi Siswa" desc="Input kehadiran kelas" />
          <QuickLink href="/dashboard/penugasan"
            icon={<Send className="h-4 w-4" />} iconBg="bg-purple-50" iconColor="text-purple-600"
            title="Penugasan" desc="Kirim / terima delegasi kelas" />
          <QuickLink href="/dashboard/program-unggulan"
            icon={<Star className="h-4 w-4" />} iconBg="bg-amber-50" iconColor="text-amber-500"
            title="Program Unggulan" desc="Capaian hafalan & program" />
        </div>
      </div>

      {/* Kehadiran Pribadi */}
      <KehadiranPribadiCard userId={userId} />
    </div>
  )
}
