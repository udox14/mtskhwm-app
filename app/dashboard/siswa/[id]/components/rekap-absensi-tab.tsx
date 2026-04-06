// Lokasi: app/dashboard/siswa/[id]/components/rekap-absensi-tab.tsx
'use client'

import { useState } from 'react'
import { getAbsensiPerSiswa } from '@/app/dashboard/rekap-absensi/actions'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  CalendarSearch, RefreshCw, CheckCircle2, AlertTriangle, 
  Clock, XCircle, MinusCircle, ChevronDown, ChevronRight,
  Loader2, BarChart3, Printer
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
export function RekapAbsensiTab({ siswaId, siswa }: { siswaId: string; siswa?: { nama_lengkap: string; nisn?: string; nis_lokal?: string; kelas?: { tingkat: number; nomor_kelas: number; kelompok: string } } }) {
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

  // ── CETAK LAPORAN ──
  const handlePrint = () => {
    if (!result || result.error || !result.days) return
    const { days, summary, siswa: siswaMeta, totalHari } = result
    const fmtTgl = (t: string) => new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    const fmtTglShort = (t: string) => new Date(t + 'T00:00:00').toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
    const nowStr = new Date(Date.now() + 7 * 60 * 60 * 1000).toLocaleString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })

    const statusColor: Record<string, string> = {
      HADIR: '#059669', 'HADIR PARSIAL': '#d97706', SAKIT: '#2563eb', IZIN: '#7c3aed', ALFA: '#dc2626'
    }
    const statusLabel: Record<string, string> = {
      HADIR: 'Hadir', 'HADIR PARSIAL': 'Hadir Parsial', SAKIT: 'Sakit', IZIN: 'Izin', ALFA: 'Alfa'
    }

    const kelasMeta = result.siswa?.kelas || '-'
    const namaMeta = siswa?.nama_lengkap || siswaMeta?.nama || '-'
    const nisnMeta = siswa?.nisn || siswaMeta?.nisn || '-'
    const nisMeta = siswa?.nis_lokal || '-'

    const TD = 'border:1px solid #ddd;padding:3px 5px;vertical-align:top;'

    // Baris tabel detail per hari
    const tableRows = days.map((day, i) => {
      const statusC = statusColor[day.statusHari] || '#333'
      const detailStr = day.detail.length > 0
        ? day.detail.map(d => `${d.nama_mapel} (Jam ${d.jam_ke_mulai}${d.jam_ke_selesai > d.jam_ke_mulai ? '\u2013' + d.jam_ke_selesai : ''}): <span style="color:${statusColor[d.status] || '#333'}">${d.status}</span>${d.catatan ? ' — ' + d.catatan : ''}`).join('<br/>')
        : '<span style="color:#059669">Hadir semua jam</span>'
      return `<tr style="background:${i % 2 === 0 ? '#fff' : '#f9fafb'}">
        <td style="${TD}text-align:center;width:28px">${i + 1}</td>
        <td style="${TD}width:28px;text-align:center;font-weight:600">${new Date(day.tanggal + 'T00:00:00').getDate()}</td>
        <td style="${TD}">${day.hariNama}</td>
        <td style="${TD}">${fmtTglShort(day.tanggal)}</td>
        <td style="${TD}text-align:center">${day.blokHadir}/${day.totalBlok}</td>
        <td style="${TD}font-weight:700;color:${statusC}">${statusLabel[day.statusHari] || day.statusHari}</td>
        <td style="${TD}font-size:8.5px;line-height:1.5">${detailStr}</td>
      </tr>`
    }).join('')

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
<title>Rekap Absensi — ${namaMeta}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Arial', sans-serif; font-size: 10px; color: #1a202c; background: #fff; }
  @page { size: 215mm 330mm; margin: 10mm 12mm 12mm 15mm; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  .page { width: 100%; max-width: 100%; }

  /* === HEADER SEKOLAH === */
  .kop { display: flex; align-items: center; gap: 10px; border-bottom: 3px solid #1a1a1a; padding-bottom: 6px; margin-bottom: 6px; }
  .kop-logo { width: 52px; height: 52px; flex-shrink: 0; }
  .kop-logo img { width: 100%; height: 100%; object-fit: contain; }
  .kop-logo-placeholder { width: 52px; height: 52px; background: #065f46; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 18px; font-weight: 900; flex-shrink: 0; }
  .kop-text { flex: 1; text-align: center; }
  .kop-text .nama-sekolah { font-size: 15px; font-weight: 900; letter-spacing: 0.5px; text-transform: uppercase; }
  .kop-text .nama-pondok { font-size: 10px; font-weight: 600; color: #374151; margin: 1px 0; }
  .kop-text .alamat { font-size: 8.5px; color: #6b7280; }

  /* === JUDUL LAPORAN === */
  .judul-wrap { text-align: center; margin: 8px 0 6px; }
  .judul-wrap h2 { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 1px; }
  .judul-wrap p { font-size: 9px; color: #4b5563; margin-top: 2px; }
  .garis-judul { height: 1px; background: #d1d5db; margin: 4px 0; }

  /* === INFO SISWA === */
  .info-box { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 4px; padding: 6px 10px; margin-bottom: 8px; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 4px 16px; }
  .info-item { display: flex; flex-direction: column; }
  .info-item .lbl { font-size: 7.5px; font-weight: 700; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .info-item .val { font-size: 10px; font-weight: 700; color: #111827; }

  /* === SUMMARY === */
  .summary-row { display: flex; gap: 6px; margin-bottom: 8px; }
  .stat-card { flex: 1; border-radius: 4px; padding: 5px 6px; text-align: center; border: 1px solid #e5e7eb; }
  .stat-card .num { font-size: 16px; font-weight: 900; line-height: 1; }
  .stat-card .lbl { font-size: 7.5px; font-weight: 700; text-transform: uppercase; margin-top: 2px; }
  .stat-hadir   { background: #f0fdf4; color: #065f46; border-color: #bbf7d0; }
  .stat-parsial { background: #fffbeb; color: #92400e; border-color: #fde68a; }
  .stat-sakit   { background: #eff6ff; color: #1e40af; border-color: #bfdbfe; }
  .stat-izin    { background: #f5f3ff; color: #5b21b6; border-color: #ddd6fe; }
  .stat-alfa    { background: #fff1f2; color: #9f1239; border-color: #fecdd3; }
  .stat-total   { background: #f8fafc; color: #334155; border-color: #cbd5e1; }

  /* === TABEL === */
  table { width: 100%; border-collapse: collapse; font-size: 9px; }
  thead tr { background: #1e293b; color: #fff; }
  thead th { border: 1px solid #334155; padding: 4px 5px; font-weight: 700; text-align: center; }
  tbody td { border: 1px solid #e2e8f0; padding: 3px 5px; vertical-align: top; }
  tbody tr:hover { background: #f8fafc; }

  /* === FOOTER === */
  .footer { margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
  .footer .ttd-box { text-align: center; }
  .footer .ttd-label { font-size: 9px; }
  .footer .ttd-space { height: 36px; }
  .footer .ttd-nama { font-size: 9px; font-weight: 700; border-top: 1px solid #374151; padding-top: 2px; width: 120px; text-align: center; }
  .colofon { font-size: 8px; color: #9ca3af; text-align: center; margin-top: 8px; }
</style>
</head>
<body>
<div class="page">

  <!-- KOP SEKOLAH -->
  <div class="kop">
    <div class="kop-logo-placeholder">M</div>
    <div class="kop-text">
      <div class="nama-pondok">Pondok Pesantren KH. Ahmad Wahab Muhsin</div>
      <div class="nama-sekolah">MTs KH. A. Wahab Muhsin Sukahideng</div>
      <div class="alamat">Sukahideng, Sukaresik, Tasikmalaya, Jawa Barat</div>
    </div>
  </div>

  <!-- JUDUL -->
  <div class="judul-wrap">
    <h2>Laporan Rekap Kehadiran Siswa</h2>
    <p>Periode: ${fmtTgl(tglMulai)} s/d ${fmtTgl(tglSelesai)}</p>
  </div>
  <div class="garis-judul"></div>

  <!-- INFO SISWA -->
  <div class="info-box">
    <div class="info-grid">
      <div class="info-item"><span class="lbl">Nama Siswa</span><span class="val">${namaMeta}</span></div>
      <div class="info-item"><span class="lbl">NISN</span><span class="val">${nisnMeta}</span></div>
      <div class="info-item"><span class="lbl">NIS Lokal</span><span class="val">${nisMeta}</span></div>
      <div class="info-item" style="margin-top:4px"><span class="lbl">Kelas</span><span class="val">${kelasMeta}</span></div>
      <div class="info-item" style="margin-top:4px"><span class="lbl">Total Hari Efektif</span><span class="val">${totalHari || days.length} hari</span></div>
    </div>
  </div>

  <!-- RINGKASAN -->
  <div class="summary-row">
    <div class="stat-card stat-hadir"><div class="num">${summary?.hadir ?? 0}</div><div class="lbl">Hadir</div></div>
    <div class="stat-card stat-parsial"><div class="num">${summary?.parsial ?? 0}</div><div class="lbl">Parsial</div></div>
    <div class="stat-card stat-sakit"><div class="num">${summary?.sakit ?? 0}</div><div class="lbl">Sakit</div></div>
    <div class="stat-card stat-izin"><div class="num">${summary?.izin ?? 0}</div><div class="lbl">Izin</div></div>
    <div class="stat-card stat-alfa"><div class="num">${summary?.alfa ?? 0}</div><div class="lbl">Alfa</div></div>
    <div class="stat-card stat-total"><div class="num">${days.length}</div><div class="lbl">Total Hari</div></div>
  </div>

  <!-- TABEL HARIAN -->
  <table>
    <thead>
      <tr>
        <th style="width:20px">No</th>
        <th style="width:22px">Tgl</th>
        <th style="width:45px">Hari</th>
        <th style="width:70px">Tanggal</th>
        <th style="width:45px">Blok</th>
        <th style="width:65px">Status Hari</th>
        <th>Detail Ketidakhadiran / Keterangan</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  <!-- FOOTER -->
  <div class="footer">
    <div style="font-size:9px;color:#6b7280">
      <p><strong>Keterangan:</strong></p>
      <p>• <strong>Hadir</strong>: Hadir semua blok jam  &nbsp; • <strong>Parsial</strong>: Hadir sebagian jam</p>
      <p>• <strong>Sakit / Izin</strong>: Tidak hadir dengan keterangan  &nbsp; • <strong>Alfa</strong>: Tidak hadir tanpa keterangan</p>
    </div>
    <div class="ttd-box">
      <p class="ttd-label">Tasikmalaya, ${new Date(Date.now() + 7*60*60*1000).toLocaleDateString('id-ID', { timeZone: 'UTC', day: 'numeric', month: 'long', year: 'numeric' })}</p>
      <p class="ttd-label" style="margin-top:2px">Wali Kelas / Kabid Kesiswaan,</p>
      <div class="ttd-space"></div>
      <div class="ttd-nama">(...............................)</div>
    </div>
  </div>

  <p class="colofon">Dokumen ini dicetak melalui Sistem Informasi Manajemen MTs KH. A. Wahab Muhsin Sukahideng &bull; ${nowStr} WIB</p>
</div>
</body></html>`

    const w = window.open('', '_blank')
    if (!w) return
    w.document.write(html)
    w.document.close()
    w.focus()
    setTimeout(() => w.print(), 300)
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
          <div className="flex gap-2 shrink-0">
            <Button
              onClick={handleLoad}
              disabled={loading}
              className="h-9 px-5 bg-cyan-600 hover:bg-cyan-700 text-white font-bold text-sm gap-2 shadow-sm"
            >
              {loading
                ? <><Loader2 className="h-4 w-4 animate-spin" /> Memuat...</>
                : loaded
                ? <><RefreshCw className="h-4 w-4" /> Muat Ulang</>
                : <><BarChart3 className="h-4 w-4" /> Muat Data</>
              }
            </Button>
            {loaded && !result?.error && (result?.days?.length ?? 0) > 0 && (
              <Button
                onClick={handlePrint}
                variant="outline"
                className="h-9 px-4 text-sm font-bold gap-2 border-cyan-300 text-cyan-700 hover:bg-cyan-50"
              >
                <Printer className="h-4 w-4" /> Cetak Laporan
              </Button>
            )}
          </div>
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
