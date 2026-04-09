// components/dashboard/shared/KehadiranPribadiCard.tsx
import { getDB } from '@/utils/db'
import { todayWIB } from '@/lib/time'
import { UserCheck, Clock } from 'lucide-react'

type Props = { userId: string }

export async function KehadiranPribadiCard({ userId }: Props) {
  const db = await getDB()
  const today = todayWIB()
  const yearMonth = today.substring(0, 7) // 'YYYY-MM'

  const data = await db.prepare(`
    SELECT
      COUNT(CASE WHEN status = 'hadir' THEN 1 END) as hadir,
      COUNT(CASE WHEN status = 'sakit' THEN 1 END) as sakit,
      COUNT(CASE WHEN status = 'izin'  THEN 1 END) as izin,
      COUNT(CASE WHEN status = 'alfa'  THEN 1 END) as alfa,
      COUNT(*) as total,
      COUNT(CASE WHEN is_telat = 1 AND status = 'hadir' THEN 1 END) as telat
    FROM presensi_pegawai
    WHERE user_id = ? AND strftime('%Y-%m', tanggal) = ?
  `).bind(userId, yearMonth).first<any>()

  const hadir = data?.hadir ?? 0
  const sakit = data?.sakit ?? 0
  const izin  = data?.izin  ?? 0
  const alfa  = data?.alfa  ?? 0
  const total = data?.total ?? 0
  const telat = data?.telat ?? 0

  const pct = total > 0 ? Math.round((hadir / total) * 100) : null

  const monthLabel = new Date(yearMonth + '-01').toLocaleDateString('id-ID', {
    month: 'long', year: 'numeric',
  })
  const pctColor = pct === null ? 'text-slate-400' : pct >= 90 ? 'text-emerald-600' : pct >= 75 ? 'text-amber-600' : 'text-rose-600'

  return (
    <div className="rounded-xl border border-surface bg-surface shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-surface-2">
        <div className="p-1.5 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
          <UserCheck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
        </div>
        <div className="flex-1">
          <p className="text-xs font-semibold text-slate-800 dark:text-slate-100">Kehadiran saya</p>
          <p className="text-[10px] text-slate-400 dark:text-slate-500">{monthLabel}</p>
        </div>
        {pct !== null && (
          <span className={`text-xl font-bold tabular-nums ${pctColor}`}>{pct}%</span>
        )}
      </div>

      {total === 0 ? (
        <div className="flex flex-col items-center justify-center gap-1.5 py-6">
          <p className="text-xs text-slate-400 dark:text-slate-500">Belum ada data presensi bulan ini</p>
        </div>
      ) : (
        <div className="grid grid-cols-4 divide-x divide-slate-100 dark:divide-slate-800">
          {[
            { label: 'Hadir', val: hadir, color: 'text-emerald-600' },
            { label: 'Sakit', val: sakit, color: 'text-amber-600'   },
            { label: 'Izin',  val: izin,  color: 'text-blue-600'    },
            { label: 'Alfa',  val: alfa,  color: 'text-rose-600'    },
          ].map(({ label, val, color }) => (
            <div key={label} className="flex flex-col items-center gap-0.5 py-3">
              <span className={`text-xl font-bold leading-none tabular-nums ${color}`}>{val}</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">{label}</span>
            </div>
          ))}
        </div>
      )}

      {telat > 0 && (
        <div className="flex items-center gap-1.5 px-4 py-2 border-t border-surface-2 bg-amber-50/60 dark:bg-amber-900/10">
          <Clock className="h-3 w-3 text-amber-500 shrink-0" />
          <p className="text-[10px] text-amber-700 dark:text-amber-400">
            Terlambat <span className="font-bold">{telat}×</span> bulan ini
          </p>
        </div>
      )}
    </div>
  )
}
