// Lokasi: app/dashboard/siswa/[id]/components/rekap-absensi-tab.tsx
'use client'

import { useState } from 'react'
import { getAbsensiPerSiswa } from '@/app/dashboard/rekap-absensi/actions'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  CalendarSearch, RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, XCircle, MinusCircle, ChevronDown, ChevronRight,
  Loader2, BarChart3
} from 'lucide-react'

// ============================================================
// TIPE
// ============================================================
type AbsensiDay = {
  tanggal: string
  hariNama: string
  totalBlok: number
  blokHadir: number
  blokTidakHadir: number
  statusHari: string
  detail: {
    status: string
    nama_mapel: string
    jam_ke_mulai: number
    jam_ke_selesai: number
    catatan?: string
    guru_nama?: string
  }[]
}

type RekapResult = {
  error: string | null
  siswa?: { nama: string; nisn: string; kelas: string }
  days?: AbsensiDay[]
  summary?: { hadir: number; parsial: number; sakit: number; izin: number; alfa: number }
  totalHari?: number
}

// ============================================================
// SUB-KOMPONEN: Badge Status
// ============================================================
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { cls: string; icon: React.ReactNode; label: string }> = {
    'HADIR':         { cls: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Hadir' },
    'HADIR PARSIAL': { cls: 'bg-amber-100 text-amber-700 border-amber-200',       icon: <Clock className="h-3 w-3" />,        label: 'Parsial' },
    'SAKIT':         { cls: 'bg-blue-100 text-blue-700 border-blue-200',           icon: <MinusCircle className="h-3 w-3" />,  label: 'Sakit' },
    'IZIN':          { cls: 'bg-indigo-100 text-indigo-700 border-indigo-200',     icon: <MinusCircle className="h-3 w-3" />,  label: 'Izin' },
    'ALFA':          { cls: 'bg-rose-100 text-rose-700 border-rose-200',           icon: <XCircle className="h-3 w-3" />,      label: 'Alfa' },
  }
  const cfg = map[status] ?? { cls: 'bg-slate-100 text-slate-600 border-slate-200', icon: null, label: status }
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${cfg.cls}`}>
      {cfg.icon}{cfg.label}
    </span>
  )
}

// ============================================================
// KOMPONEN UTAMA
// ============================================================
export function RekapAbsensiTab({ siswaId }: { siswaId: string }) {
  // Default: 1 bulan ke belakang
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const fmt = (d: Date) => d.toISOString().split('T')[0]

  const [tglMulai, setTglMulai] = useState(fmt(firstOfMonth))
  const [tglSelesai, setTglSelesai] = useState(fmt(today))
  const [loading, setLoading] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [result, setResult] = useState<RekapResult | null>(null)
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())

  const toggleDay = (tgl: string) => setExpandedDays(prev => {
    const next = new Set(prev)
    next.has(tgl) ? next.delete(tgl) : next.add(tgl)
    return next
  })

  const handleLoad = async () => {
    setLoading(true)
    setLoaded(false)
    setResult(null)
    setExpandedDays(new Set())
    try {
      const data = await getAbsensiPerSiswa(siswaId, tglMulai, tglSelesai)
      setResult(data as RekapResult)
      setLoaded(true)
    } catch (e) {
      setResult({ error: 'Gagal memuat data. Coba lagi.' })
      setLoaded(true)
    } finally {
      setLoading(false)
    }
  }

  const summary = result?.summary
  const days = result?.days ?? []

  // ── Stat card ──
  const statCards = summary ? [
    { label: 'Hadir',   val: summary.hadir,   cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
    { label: 'Parsial', val: summary.parsial, cls: 'bg-amber-50 border-amber-200 text-amber-700' },
    { label: 'Sakit',   val: summary.sakit,   cls: 'bg-blue-50 border-blue-200 text-blue-700' },
    { label: 'Izin',    val: summary.izin,    cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
    { label: 'Alfa',    val: summary.alfa,    cls: 'bg-rose-50 border-rose-200 text-rose-700' },
  ] : []

  return (
    <div className="space-y-4">
      {/* ─── FILTER & TOMBOL ─── */}
      <div className="bg-surface border border-surface rounded-xl p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CalendarSearch className="h-5 w-5 text-cyan-600" />
          <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm">Rekap Absensi Harian</h3>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-end">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={tglMulai}
                max={tglSelesai}
                onChange={e => setTglMulai(e.target.value)}
                className="w-full border border-surface rounded-lg px-3 py-1.5 text-sm font-medium bg-surface-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Tanggal Selesai
              </label>
              <input
                type="date"
                value={tglSelesai}
                min={tglMulai}
                onChange={e => setTglSelesai(e.target.value)}
                className="w-full border border-surface rounded-lg px-3 py-1.5 text-sm font-medium bg-surface-2 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-400"
              />
            </div>
          </div>
          <Button
            onClick={handleLoad}
            disabled={loading}
            className="h-9 px-5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm gap-2 shrink-0 shadow-sm"
          >
            {loading
              ? <><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</>
              : loaded
              ? <><RefreshCw className="h-4 w-4" /> Muat Ulang</>
              : <><BarChart3 className="h-4 w-4" /> Muat Data Absensi</>
            }
          </Button>
        </div>
      </div>

      {/* ─── PLACEHOLDER (SEBELUM LOAD) ─── */}
      {!loaded && !loading && (
        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-surface border border-dashed border-surface rounded-xl">
          <BarChart3 className="h-12 w-12 mb-4 opacity-25" />
          <p className="font-semibold text-slate-500">Data belum dimuat</p>
          <p className="text-sm mt-1">Atur rentang tanggal lalu tekan <strong>Muat Data Absensi</strong></p>
        </div>
      )}

      {/* ─── LOADING SKELETON ─── */}
      {loading && (
        <div className="space-y-2 animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-14 bg-surface rounded-xl border border-surface" />
          ))}
        </div>
      )}

      {/* ─── ERROR ─── */}
      {loaded && result?.error && (
        <div className="flex items-center gap-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl p-4">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p className="font-semibold text-sm">{result.error}</p>
        </div>
      )}

      {/* ─── HASIL ─── */}
      {loaded && !result?.error && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {statCards.map(s => (
              <div key={s.label} className={`border rounded-xl p-3 text-center flex flex-col items-center ${s.cls}`}>
                <p className="text-2xl font-black">{s.val}</p>
                <p className="text-[10px] font-bold uppercase tracking-wider mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Daftar Harian */}
          {days.length === 0 ? (
            <div className="text-center py-12 bg-surface border border-dashed border-surface rounded-xl text-slate-400">
              <CheckCircle2 className="h-10 w-10 mx-auto mb-3 text-emerald-200" />
              <p className="font-semibold text-slate-500">Tidak ada data absensi pada rentang ini.</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[520px] pr-1">
              <div className="space-y-1.5">
                {days.map(day => {
                  const isExpanded = expandedDays.has(day.tanggal)
                  const hasDetail = day.detail.length > 0
                  return (
                    <div
                      key={day.tanggal}
                      className="border border-surface rounded-xl overflow-hidden bg-surface shadow-sm"
                    >
                      {/* Row Utama */}
                      <button
                        onClick={() => hasDetail && toggleDay(day.tanggal)}
                        disabled={!hasDetail}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left ${
                          hasDetail ? 'hover:bg-surface-2 cursor-pointer' : 'cursor-default'
                        } ${isExpanded ? 'bg-surface-2' : ''}`}
                      >
                        {/* Tanggal */}
                        <div className="shrink-0 text-center w-10">
                          <p className="text-xs font-black text-slate-800 dark:text-slate-100 leading-none">
                            {new Date(day.tanggal + 'T00:00:00').getDate()}
                          </p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase">
                            {day.hariNama.slice(0, 3)}
                          </p>
                        </div>

                        {/* Tanggal lengkap */}
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                            {new Date(day.tanggal + 'T00:00:00').toLocaleDateString('id-ID', {
                              day: 'numeric', month: 'long', year: 'numeric'
                            })}
                          </p>
                          <p className="text-[10px] text-slate-400 mt-0.5">
                            {day.blokHadir}/{day.totalBlok} blok hadir
                          </p>
                        </div>

                        {/* Status */}
                        <StatusBadge status={day.statusHari} />

                        {/* Chevron jika ada detail */}
                        {hasDetail && (
                          <span className="text-slate-400 shrink-0">
                            {isExpanded
                              ? <ChevronDown className="h-4 w-4" />
                              : <ChevronRight className="h-4 w-4" />}
                          </span>
                        )}
                      </button>

                      {/* Detail Ketidakhadiran */}
                      {isExpanded && hasDetail && (
                        <div className="border-t border-surface bg-slate-50/70 divide-y divide-slate-100 animate-in slide-in-from-top-1 fade-in duration-200">
                          {day.detail.map((d, i) => (
                            <div key={i} className="flex items-start gap-3 px-4 py-2">
                              <span className={`mt-0.5 shrink-0 text-[10px] font-black px-2 py-0.5 rounded-full border ${
                                d.status === 'ALFA'  ? 'bg-rose-100 text-rose-700 border-rose-200' :
                                d.status === 'SAKIT' ? 'bg-blue-100 text-blue-700 border-blue-200' :
                                d.status === 'IZIN'  ? 'bg-indigo-100 text-indigo-700 border-indigo-200' :
                                'bg-slate-100 text-slate-600 border-slate-200'
                              }`}>
                                {d.status}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{d.nama_mapel}</p>
                                <p className="text-[10px] text-slate-400 mt-0.5">
                                  Jam ke-{d.jam_ke_mulai}{d.jam_ke_selesai > d.jam_ke_mulai ? `–${d.jam_ke_selesai}` : ''}
                                  {d.guru_nama ? ` · ${d.guru_nama}` : ''}
                                </p>
                                {d.catatan && (
                                  <p className="text-[10px] italic text-slate-500 mt-0.5 bg-white border border-slate-100 rounded px-2 py-0.5">
                                    "{d.catatan}"
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </>
      )}
    </div>
  )
}
