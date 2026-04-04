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
  domisili_pegawai: string | null; jabatan_nama: string
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

export function PresensiClient({ pegawai, presensiHariIni, pengaturan, tanggal, currentUserId }: {
  pegawai: Pegawai[]; presensiHariIni: Presensi[]; pengaturan: Pengaturan; tanggal: string; currentUserId: string
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

  // Live clock
  useState(() => {
    const interval = setInterval(() => setCurrentTime(nowWIB()), 30000)
    return () => clearInterval(interval)
  })

  const presensiMap = new Map(presensiHariIni.map(p => [p.user_id, p]))

  const handleMasuk = async (userId: string) => {
    setLoadingId(userId)
    const res = await catatPresensiMasuk(userId, currentUserId, undefined)
    if (res.error) alert(res.error)
    setLoadingId(null)
  }

  const handlePulang = async (userId: string) => {
    setLoadingId(userId)
    const res = await catatPresensiPulang(userId, currentUserId)
    if (res.error) alert(res.error)
    setLoadingId(null)
  }

  const handleSetStatus = async () => {
    if (!statusModal) return
    setModalPending(true)
    const res = await setStatusPresensi(statusModal.id, statusValue, currentUserId, statusCatatan || undefined)
    if (res.error) alert(res.error)
    else setStatusModal(null)
    setModalPending(false)
  }

  const handleEditSave = async () => {
    if (!editData) return
    setModalPending(true)
    const res = await editWaktuPresensi(
      editData.presensi.id,
      editJamMasuk || null,
      editJamPulang || null,
      currentUserId
    )
    if (res?.error) alert(res.error)
    else setEditData(null)
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
  const hadir = presensiHariIni.filter(p => p.status === 'hadir').length
  const telat = presensiHariIni.filter(p => p.is_telat).length
  const absen = presensiHariIni.filter(p => ['sakit', 'izin', 'alfa', 'dinas_luar'].includes(p.status)).length
  const belum = totalPegawai - presensiHariIni.length

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

      <div className="space-y-3">
        {/* HEADER INFO */}
        <div className="bg-surface border border-surface rounded-lg p-3 flex flex-wrap gap-3 items-center justify-between">
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 text-teal-500" />
            <div>
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{hariStr}, {tanggal}</p>
              <p className="text-[10px] text-slate-400">Jam kerja: {pengaturan.jam_masuk} — {pengaturan.jam_pulang} | Toleransi telat: {pengaturan.batas_telat_menit} mnt</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <Timer className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-sm font-mono font-semibold text-slate-700 dark:text-slate-200">
              {String(currentTime.getUTCHours()).padStart(2, '0')}:{String(currentTime.getUTCMinutes()).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* STATS */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { label: 'Hadir', value: hadir, total: totalPegawai, color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
            { label: 'Telat', value: telat, total: hadir, color: 'text-amber-600 bg-amber-50 border-amber-200' },
            { label: 'Tidak Hadir', value: absen, total: totalPegawai, color: 'text-rose-600 bg-rose-50 border-rose-200' },
            { label: 'Belum Absen', value: belum, total: totalPegawai, color: 'text-slate-600 bg-slate-50 border-slate-200' },
          ].map(s => (
            <div key={s.label} className={cn("rounded-lg border px-3 py-2", s.color)}>
              <p className="text-lg font-bold">{s.value}<span className="text-xs font-normal opacity-60">/{s.total}</span></p>
              <p className="text-[10px] font-medium">{s.label}</p>
            </div>
          ))}
        </div>

        {/* GRID CARDS */}
        {pegawai.length === 0 ? (
          <div className="bg-surface py-10 rounded-lg border border-surface text-center">
            <Building2 className="h-7 w-7 text-slate-300 mx-auto mb-2" />
            <p className="text-sm text-slate-400">Belum ada pegawai dengan jabatan struktural.</p>
            <p className="text-xs text-slate-400 mt-1">Assign jabatan di halaman Guru & Pegawai.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
            {pegawai.map(pg => {
              const pr = presensiMap.get(pg.id)
              const status = pr?.status || null
              const cfg = status ? STATUS_CONFIG[status] : null
              const StatusIcon = cfg?.icon || null

              return (
                <div key={pg.id} className={cn(
                  "bg-surface border rounded-xl p-3.5 transition-all",
                  status === 'hadir' ? 'border-emerald-200' : status ? 'border-surface' : 'border-dashed border-slate-300'
                )}>
                  {/* Top: Name + Jabatan */}
                  <div className="flex items-start gap-2.5 mb-3">
                    <div className={cn(
                      "h-10 w-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0",
                      status === 'hadir' ? 'bg-emerald-100 text-emerald-700' :
                        status ? 'bg-slate-100 text-slate-500' : 'bg-slate-50 text-slate-400'
                    )}>
                      {pg.nama_lengkap.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{pg.nama_lengkap}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                          <Building2 className="h-2.5 w-2.5" />{pg.jabatan_nama}
                        </span>
                        {pg.domisili_pegawai && (
                          <span className={cn("inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                            pg.domisili_pegawai === 'dalam' ? 'bg-blue-50 text-blue-600 border-blue-200' : 'bg-amber-50 text-amber-600 border-amber-200'
                          )}>
                            <MapPin className="h-2.5 w-2.5" />{pg.domisili_pegawai === 'dalam' ? 'Dalam' : 'Luar'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Status Badge */}
                  {cfg && (
                    <div className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border mb-3 text-xs font-semibold", cfg.color)}>
                      {StatusIcon && <StatusIcon className="h-3.5 w-3.5" />}
                      {cfg.label}
                      {pr?.is_telat ? <span className="ml-auto text-[10px] font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">TELAT</span> : null}
                      {pr?.is_pulang_cepat ? <span className="ml-auto text-[10px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded border border-orange-200">PULANG CEPAT</span> : null}
                    </div>
                  )}

                  {/* Time display */}
                  {pr?.status === 'hadir' && (
                    <div className="flex items-center gap-3 mb-3 text-xs">
                      <div className="flex items-center gap-1 text-emerald-600">
                        <LogIn className="h-3 w-3" />
                        <span className="font-mono font-semibold">{pr.jam_masuk || '—'}</span>
                      </div>
                      <span className="text-slate-300">→</span>
                      <div className="flex items-center gap-1 text-rose-500">
                        <LogOut className="h-3 w-3" />
                        <span className="font-mono font-semibold">{pr.jam_pulang || '—'}</span>
                      </div>
                      {pr && (
                        <button onClick={() => openEdit(pr, pg)} className="ml-auto p-1 rounded text-slate-400 hover:text-emerald-600 hover:bg-emerald-50">
                          <Pencil className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  )}

                  {pr?.catatan && (
                    <p className="text-[10px] text-slate-400 mb-2 italic truncate">{pr.catatan}</p>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-1.5">
                    {!pr ? (
                      <>
                        <Button size="sm" onClick={() => handleMasuk(pg.id)} disabled={loadingId === pg.id}
                          className="flex-1 h-8 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white gap-1">
                          {loadingId === pg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogIn className="h-3 w-3" />} Masuk
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setStatusModal(pg); setStatusValue('sakit'); setStatusCatatan('') }} disabled={loadingId === pg.id}
                          className="h-8 text-xs rounded-lg gap-1">
                          <AlertTriangle className="h-3 w-3" /> Status
                        </Button>
                      </>
                    ) : pr.status === 'hadir' && !pr.jam_pulang ? (
                      <Button size="sm" onClick={() => handlePulang(pg.id)} disabled={loadingId === pg.id}
                        className="flex-1 h-8 text-xs rounded-lg bg-rose-500 hover:bg-rose-600 text-white gap-1">
                        {loadingId === pg.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />} Pulang
                      </Button>
                    ) : pr.status === 'hadir' && pr.jam_pulang ? (
                      <div className="flex-1 flex items-center justify-center h-8 text-xs text-emerald-600 font-semibold gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Selesai
                      </div>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => { setStatusModal(pg); setStatusValue(pr.status); setStatusCatatan(pr.catatan || '') }} disabled={loadingId === pg.id}
                        className="flex-1 h-8 text-xs rounded-lg gap-1">
                        <Pencil className="h-3 w-3" /> Ubah Status
                      </Button>
                    )}
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
