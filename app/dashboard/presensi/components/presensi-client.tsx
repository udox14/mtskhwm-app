'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import {
  LogIn, LogOut, Clock, AlertTriangle, CheckCircle2, XCircle, Stethoscope,
  FileText, Loader2, Pencil, MapPin, Building2, CalendarDays, Timer
} from 'lucide-react'
import { catatPresensiMasuk, catatPresensiPulang, setStatusPresensi, editWaktuPresensi } from '../actions'
import { cn } from '@/lib/utils'
import { nowWIB } from '@/lib/time'

type Pegawai = {
  id: string; nama_lengkap: string; email: string;
  domisili_pegawai: string | null; jabatan_nama: string;
  avatar_url: string | null; is_struktural: boolean;
}
type Presensi = {
  id: string; user_id: string; tanggal: string; jam_masuk: string | null;
  jam_pulang: string | null; status: string; is_telat: number;
  is_pulang_cepat: number; catatan: string | null
}
type Pengaturan = {
  jam_masuk: string; jam_pulang: string;
  batas_telat_menit: number; batas_pulang_cepat_menit: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  hadir: { label: 'Hadir', color: 'bg-emerald-100 text-emerald-700 border-emerald-200', icon: CheckCircle2 },
  sakit: { label: 'Sakit', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Stethoscope },
  izin: { label: 'Izin', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: FileText },
  alfa: { label: 'Alfa', color: 'bg-rose-100 text-rose-700 border-rose-200', icon: XCircle },
  dinas_luar: { label: 'Dinas Luar', color: 'bg-violet-100 text-violet-700 border-violet-200', icon: MapPin },
}

const getAvatarColor = (name: string) => {
  const colors = [
    'from-rose-400 to-rose-600', 'from-violet-400 to-violet-600',
    'from-blue-400 to-blue-600', 'from-emerald-400 to-emerald-600',
    'from-amber-400 to-amber-600', 'from-cyan-400 to-cyan-600'
  ]
  let hash = 0; for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function PresensiClient({ pegawai, presensiHariIni, pengaturan, tanggal, currentUserId, currentUserRole }: {
  pegawai: Pegawai[]; presensiHariIni: Presensi[]; pengaturan: Pengaturan; tanggal: string; currentUserId: string; currentUserRole: string
}) {
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [editData, setEditData] = useState<{ presensi: Presensi; pegawai: Pegawai } | null>(null)
  const [editJamMasuk, setEditJamMasuk] = useState('')
  const [editJamPulang, setEditJamPulang] = useState('')
  const [statusModal, setStatusModal] = useState<Pegawai | null>(null)
  const [statusValue, setStatusValue] = useState('sakit')
  const [statusCatatan, setStatusCatatan] = useState('')
  const [currentTime, setCurrentTime] = useState(nowWIB())
  const [modalPending, setModalPending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [fakeMap, setFakeMap] = useState<Record<string, Presensi>>({})

  // Initialize fakeMap from localStorage
  useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`fake_presensi_${tanggal}`)
      if (stored) {
        try { setFakeMap(JSON.parse(stored)) } catch (e) {}
      }
    }
  })

  // Save fakeMap to localStorage
  const updateFakeMap = (recipe: (prev: Record<string, Presensi>) => Record<string, Presensi>) => {
    setFakeMap(prev => {
      const next = recipe(prev)
      localStorage.setItem(`fake_presensi_${tanggal}`, JSON.stringify(next))
      return next
    })
  }

  // Live clock
  useState(() => {
    const interval = setInterval(() => setCurrentTime(nowWIB()), 30000)
    return () => clearInterval(interval)
  })

  // Combine real and fake presensi
  const presensiMap = new Map(presensiHariIni.map(p => [p.user_id, p]))
  Object.values(fakeMap).forEach(p => presensiMap.set(p.user_id, p))

  const handleMasuk = async (pg: Pegawai) => {
    setLoadingId(pg.id)
    if (pg.is_struktural) {
      const res = await catatPresensiMasuk(pg.id, currentUserId, undefined)
      if (res.error) alert(res.error)
    } else {
      const timeStr = nowWIB().toTimeString().slice(0, 5)
      updateFakeMap(prev => ({ ...prev, [pg.id]: { id: 'fake_m_' + pg.id, user_id: pg.id, tanggal, jam_masuk: timeStr, jam_pulang: null, status: 'hadir', is_telat: 0, is_pulang_cepat: 0, catatan: null } }))
    }
    setLoadingId(null)
  }

  const handlePulang = async (pg: Pegawai) => {
    setLoadingId(pg.id)
    if (pg.is_struktural) {
      const res = await catatPresensiPulang(pg.id, currentUserId)
      if (res.error) alert(res.error)
    } else {
      const timeStr = nowWIB().toTimeString().slice(0, 5)
      updateFakeMap(prev => ({
        ...prev,
        [pg.id]: prev[pg.id] ? { ...prev[pg.id], jam_pulang: timeStr } : { id: 'fake_p_' + pg.id, user_id: pg.id, tanggal, jam_masuk: null, jam_pulang: timeStr, status: 'hadir', is_telat: 0, is_pulang_cepat: 0, catatan: null }
      }))
    }
    setLoadingId(null)
  }

  const handleSetStatus = async () => {
    if (!statusModal) return
    setModalPending(true)
    if (statusModal.is_struktural) {
      const res = await setStatusPresensi(statusModal.id, statusValue, currentUserId, statusCatatan || undefined)
      if (res.error) alert(res.error)
      else setStatusModal(null)
    } else {
      updateFakeMap(prev => ({ ...prev, [statusModal.id]: { id: 'fake_s_' + statusModal.id, user_id: statusModal.id, tanggal, jam_masuk: null, jam_pulang: null, status: statusValue, is_telat: 0, is_pulang_cepat: 0, catatan: statusCatatan || null } }))
      setStatusModal(null)
    }
    setModalPending(false)
  }

  const handleEditSave = async () => {
    if (!editData) return
    setModalPending(true)
    if (editData.pegawai.is_struktural) {
      const res = await editWaktuPresensi(
        editData.presensi.id,
        editJamMasuk || null,
        editJamPulang || null,
        currentUserId
      )
      if (res?.error) alert(res.error)
      else setEditData(null)
    } else {
      setFakeMap(prev => ({ ...prev, [editData.pegawai.id]: { ...prev[editData.pegawai.id], jam_masuk: editJamMasuk || null, jam_pulang: editJamPulang || null } }))
      setEditData(null)
    }
    setModalPending(false)
  }

  const openEdit = (p: Presensi, pg: Pegawai) => {
    setEditData({ presensi: p, pegawai: pg })
    setEditJamMasuk(p.jam_masuk || '')
    setEditJamPulang(p.jam_pulang || '')
  }

  const hari = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu']
  const d = new Date(tanggal + 'T00:00:00')
  const hariStr = hari[d.getDay()]

  // Stats
  const totalPegawai = pegawai.length
  const hadir = Array.from(presensiMap.values()).filter(p => p.status === 'hadir').length
  const telat = Array.from(presensiMap.values()).filter(p => p.is_telat).length
  const absen = Array.from(presensiMap.values()).filter(p => ['sakit', 'izin', 'alfa', 'dinas_luar'].includes(p.status)).length
  const belum = totalPegawai - presensiMap.size

  const filteredPegawai = pegawai.filter(p => p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || p.jabatan_nama.toLowerCase().includes(searchTerm.toLowerCase()))

  return (
    <>
      {/* MODAL SET STATUS */}
      <Dialog open={!!statusModal} onOpenChange={o => !o && setStatusModal(null)}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-sm font-semibold">Set Status — {statusModal?.nama_lengkap}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Status</Label>
              <Select value={statusValue} onValueChange={setStatusValue}>
                <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="sakit" className="text-xs">Sakit</SelectItem>
                  <SelectItem value="izin" className="text-xs">Izin</SelectItem>
                  <SelectItem value="alfa" className="text-xs">Alfa (Tanpa Keterangan)</SelectItem>
                  <SelectItem value="dinas_luar" className="text-xs">Dinas Luar</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Keterangan (opsional)</Label>
              <Input value={statusCatatan} onChange={e => setStatusCatatan(e.target.value)} className="h-9 text-sm rounded-lg" placeholder="Alasan..." />
            </div>
            <Button onClick={handleSetStatus} disabled={modalPending} className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              {modalPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Status'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* MODAL EDIT WAKTU */}
      <Dialog open={!!editData} onOpenChange={o => !o && setEditData(null)}>
        <DialogContent className="sm:max-w-sm rounded-xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-sm font-semibold">Edit Waktu — {editData?.pegawai.nama_lengkap}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Jam Masuk</Label>
              <Input type="time" value={editJamMasuk} onChange={e => setEditJamMasuk(e.target.value)} className="h-9 text-sm rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600">Jam Pulang</Label>
              <Input type="time" value={editJamPulang} onChange={e => setEditJamPulang(e.target.value)} className="h-9 text-sm rounded-lg" />
            </div>
            <Button onClick={handleEditSave} disabled={modalPending} className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              {modalPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Perubahan'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      {/* HEADER SECTION (STATS & CLOCK) */}
      <div className="flex flex-col md:flex-row gap-4 p-4 lg:p-6 pb-2 lg:pb-2">
        {/* BIG CLOCK SECTION */}
        <div className="flex flex-col items-center md:items-start justify-center px-4 py-3 bg-gradient-to-br from-emerald-600 to-teal-800 text-white rounded-2xl shadow border border-emerald-500/20 md:w-64 shrink-0 overflow-hidden relative">
          <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
            <Clock className="w-24 h-24" />
          </div>
          <p className="text-sm font-medium text-emerald-100/90 mb-0.5">{hariStr}, {tanggal}</p>
          <div className="flex items-baseline gap-1">
            <span className="text-4xl lg:text-5xl font-black tracking-tight">{currentTime.toTimeString().slice(0, 5)}</span>
            <span className="text-sm font-semibold text-emerald-200">WIB</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-emerald-200 mt-1.5 opacity-80 font-semibold gap-1 flex items-center">
            <Timer className="w-3 h-3" /> Jam Berjalan
          </p>
        </div>

        {/* STATS SECTION */}
        <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div className="bg-surface border rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <div className="p-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg group-hover:bg-slate-200 transition-colors"><Building2 className="h-4 w-4" /></div>
              <p className="text-xs font-semibold">Total Pegawai</p>
            </div>
            <p className="text-2xl font-bold ml-1 text-slate-800 dark:text-slate-100">{totalPegawai}</p>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group border-l-[3px] border-l-emerald-500">
            <div className="flex items-center gap-1.5 text-emerald-600 mb-1">
              <div className="p-1.5 bg-emerald-100 rounded-lg group-hover:bg-emerald-200 transition-colors"><CheckCircle2 className="h-4 w-4" /></div>
              <p className="text-xs font-semibold">Hadir</p>
            </div>
            <p className="text-2xl font-bold ml-1 text-emerald-700">{hadir} <span className="text-xs text-emerald-600/70">{telat > 0 && `(${telat} telat)`}</span></p>
          </div>
          <div className="bg-rose-50/50 border border-rose-100 rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group border-l-[3px] border-l-rose-500">
            <div className="flex items-center gap-1.5 text-rose-600 mb-1">
              <div className="p-1.5 bg-rose-100 rounded-lg group-hover:bg-rose-200 transition-colors"><XCircle className="h-4 w-4" /></div>
              <p className="text-xs font-semibold">Absen</p>
            </div>
            <p className="text-2xl font-bold ml-1 text-rose-700">{absen}</p>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 border rounded-2xl p-3 flex flex-col justify-between hover:shadow-md transition-shadow cursor-default group border-l-[3px] border-l-slate-400">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
              <div className="p-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg group-hover:bg-slate-300 transition-colors"><Clock className="h-4 w-4" /></div>
              <p className="text-xs font-semibold">Belum Presensi</p>
            </div>
            <p className="text-2xl font-bold ml-1 text-slate-700 dark:text-slate-200">{belum}</p>
          </div>
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="p-4 pt-2 lg:p-6 lg:pt-2 space-y-4">
        {/* SEARCH BAR FULL WIDTH */}
        <div className="w-full relative">
          <Input placeholder="Cari berdasarkan nama atau jabatan..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="h-11 pl-10 border-slate-200 dark:border-slate-800 rounded-xl bg-surface focus-visible:ring-emerald-500 shadow-sm" />
          <svg className="w-5 h-5 absolute left-3.5 top-3 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>

        {/* GRID CARDS */}
        {filteredPegawai.length === 0 ? (
          <div className="bg-surface py-10 rounded-lg border border-surface text-center">
            <Building2 className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Tidak ada pegawai yang cocok dengan pencarian.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {filteredPegawai.map(pg => {
              const pr = presensiMap.get(pg.id)
              const status = pr?.status || null
              const cfg = status ? STATUS_CONFIG[status] : null
              const StatusIcon = cfg?.icon || null

              return (
                <div key={pg.id} className={cn(
                  "bg-surface border rounded-xl p-2.5 flex gap-3 h-[132px] overflow-hidden transition-all",
                  status === 'hadir' ? 'border-emerald-200' : status ? 'border-surface' : 'border-dashed border-slate-300'
                )}>
                  {/* Photo Profile 3:4 */}
                  <div className="w-[84px] h-[112px] shrink-0 rounded bg-slate-100 border border-slate-100 dark:border-slate-800 flex items-center justify-center relative overflow-hidden">
                    {pg.avatar_url ? (
                      <img src={pg.avatar_url} alt={pg.nama_lengkap} className="w-full h-full object-cover" />
                    ) : (
                      <div className={cn("w-full h-full bg-gradient-to-br flex items-center justify-center text-4xl font-black text-white/50", getAvatarColor(pg.nama_lengkap))}>
                        {pg.nama_lengkap.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Info area */}
                  <div className="flex-1 flex flex-col min-w-0">
                    <div className="flex-1 min-w-0 mb-1">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight" title={pg.nama_lengkap}>{pg.nama_lengkap}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700 max-w-full truncate">
                          <Building2 className="h-2 w-2 shrink-0" /><span className="truncate">{pg.jabatan_nama}</span>
                        </span>
                      </div>
                      
                      {/* Fixed height status block */}
                      <div className="h-[36px] mt-2 flex flex-col justify-start">
                        {cfg ? (
                          <div className={cn("flex items-center gap-1.5 px-1.5 py-0.5 rounded border text-[10px] font-semibold w-fit", cfg.color)}>
                            {StatusIcon && <StatusIcon className="h-3 w-3 shrink-0" />}
                            <span>{cfg.label}</span>
                            {pr?.is_telat ? <span className="ml-1 text-[8px] font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded shadow-sm border border-amber-100">TELAT</span> : null}
                            {pr?.is_pulang_cepat ? <span className="ml-1 text-[8px] font-bold text-orange-600 bg-orange-50 px-1 py-0.5 rounded shadow-sm border border-orange-100">PC</span> : null}

                            {pr?.status === 'hadir' && pr?.jam_masuk && (
                              <div className="flex items-center gap-1 ml-1 pl-1.5 border-l border-emerald-200 font-mono text-[9px]">
                                <LogIn className="h-2.5 w-2.5"/> {pr.jam_masuk}
                                {pr.jam_pulang && <><span className="text-emerald-400">→</span><LogOut className="h-2.5 w-2.5"/> {pr.jam_pulang}</>}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 italic">Belum absen</div>
                        )}
                        {pr?.catatan && (
                          <p className="text-[9px] text-slate-400 italic line-clamp-1 mt-0.5" title={pr.catatan}>{pr.catatan}</p>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons (bottom aligned, fixed size) */}
                    <div className="flex gap-1.5 shrink-0 mt-auto">
                      {!pr ? (
                        <>
                          <Button size="sm" onClick={() => handleMasuk(pg)} disabled={loadingId === pg.id}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white shadow-sm gap-1 px-2">
                            {loadingId === pg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />} Masuk
                          </Button>
                          {currentUserRole === 'admin' && (
                            <Button size="sm" variant="outline" onClick={() => { setStatusModal(pg); setStatusValue('sakit'); setStatusCatatan('') }} disabled={loadingId === pg.id}
                              className="h-8 text-xs rounded-lg gap-1 px-2.5 shrink-0 border-slate-200 hover:bg-slate-50">
                              <AlertTriangle className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          )}
                        </>
                      ) : pr.status === 'hadir' && !pr.jam_pulang ? (
                        <>
                          <Button size="sm" onClick={() => handlePulang(pg)} disabled={loadingId === pg.id}
                            className="flex-1 h-8 text-xs font-semibold rounded-lg bg-gradient-to-r from-rose-500 to-rose-600 hover:from-rose-600 hover:to-rose-700 text-white shadow-sm gap-1 px-2">
                            {loadingId === pg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />} Pulang
                          </Button>
                          {currentUserRole === 'admin' && (
                            <Button size="sm" variant="outline" onClick={() => openEdit(pr, pg)} className="h-8 w-8 p-0 rounded-lg shrink-0 border-slate-200 hover:bg-slate-50">
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          )}
                        </>
                      ) : pr.status === 'hadir' && pr.jam_pulang ? (
                        <>
                          <div className="flex-1 flex items-center justify-center h-8 text-xs text-emerald-700 font-bold gap-1.5 bg-emerald-50 rounded-lg border border-emerald-200">
                            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Selesai
                          </div>
                          {currentUserRole === 'admin' && (
                            <Button size="sm" variant="outline" onClick={() => openEdit(pr, pg)} className="h-8 w-8 p-0 rounded-lg shrink-0 border-slate-200 hover:bg-slate-50">
                              <Pencil className="h-3.5 w-3.5 text-slate-500" />
                            </Button>
                          )}
                        </>
                      ) : (
                        currentUserRole === 'admin' ? (
                          <Button size="sm" variant="outline" onClick={() => { setStatusModal(pg); setStatusValue(pr.status); setStatusCatatan(pr.catatan || '') }} disabled={loadingId === pg.id}
                            className="flex-1 h-8 text-xs font-medium rounded-lg gap-1 border-slate-200 hover:bg-slate-50">
                            <Pencil className="h-3 w-3 text-slate-500" /> Ubah Status
                          </Button>
                        ) : (
                          <div className="flex-1 flex items-center justify-center h-8 text-xs text-slate-500 font-semibold gap-1 bg-surface rounded-lg border border-surface">
                            {STATUS_CONFIG[pr.status]?.label}
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
