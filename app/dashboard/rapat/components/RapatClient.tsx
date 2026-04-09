'use client'

import { useState, useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, AlertCircle, Plus, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buatUndanganRapat, konfirmasiKehadiran } from '../actions'
import { cn } from '@/lib/utils'

const initialState: any = {}

function SubmitBuatRapatBtn() {
  const { pending } = useFormStatus()
  return (
    <Button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10">
      {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
      Buat & Kirim Undangan
    </Button>
  )
}

export function RapatClient({ undanganMasuk, rapatDibuat, canCreate, roles = [] }: { undanganMasuk: any[], rapatDibuat: any[], canCreate: boolean, roles: any[] }) {
  const [activeTab, setActiveTab] = useState('masuk')
  const [createState, createAction] = useActionState(buatUndanganRapat, initialState)
  const [targetType, setTargetType] = useState('all')

  // Untuk form konfirmasi
  const [isConfirming, setIsConfirming] = useState<string | null>(null)
  
  const handleKonfirmasi = async (pesertaId: string, status: 'HADIR'|'TIDAK_HADIR', alasan: string = '') => {
    setIsConfirming(pesertaId)
    try {
      const res = await konfirmasiKehadiran(pesertaId, status, alasan)
      if (res.error) alert(res.error)
    } finally {
      setIsConfirming(null)
    }
  }

  const getStatusBadge = (status: string) => {
    if (status === 'BELUM_RESPOND') return 'bg-amber-50 text-amber-700 border-amber-200'
    if (status === 'HADIR') return 'bg-emerald-50 text-emerald-700 border-emerald-200'
    return 'bg-rose-50 text-rose-700 border-rose-200'
  }

  return (
    <div className="space-y-4">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-surface border border-surface p-0.5 h-auto rounded-lg grid grid-cols-2 w-fit">
            <TabsTrigger value="masuk" className="py-1.5 px-4 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs font-medium">
              Undangan Masuk ({undanganMasuk.filter(u => u.status_kehadiran === 'BELUM_RESPOND').length})
            </TabsTrigger>
            {canCreate && (
              <TabsTrigger value="dibuat" className="py-1.5 px-4 rounded-md data-[state=active]:bg-slate-900 data-[state=active]:text-white text-xs font-medium">
                Rapat Buatan Saya ({rapatDibuat.length})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {canCreate && activeTab === 'dibuat' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2 h-9 text-sm rounded-lg">
                <Plus className="h-4 w-4" /> Buat Rapat Baru
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Buat Undangan Rapat</DialogTitle>
              </DialogHeader>
              <form action={createAction} className="space-y-4 pt-2">
                {createState?.error && (
                  <div className="p-3 text-sm text-rose-600 bg-rose-50 rounded-lg border border-rose-100 flex gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {createState.error}
                  </div>
                )}
                {createState?.success && (
                  <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100 flex gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> {createState.success}
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Agenda Rapat</Label>
                  <Input name="agenda" required placeholder="Cth: Rapat Pleno Kelulusan" className="h-9 text-sm" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Tanggal</Label>
                    <Input name="tanggal" type="date" required defaultValue={new Date().toISOString().split('T')[0]} className="h-9 text-sm" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Waktu</Label>
                    <Input name="waktu" type="time" required defaultValue="09:00" className="h-9 text-sm" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Tempat</Label>
                  <Input name="tempat" required placeholder="Cth: Ruang Guru" className="h-9 text-sm" />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Target Undangan</Label>
                  <select name="targetType" value={targetType} onChange={e => setTargetType(e.target.value)} className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="all">Semua Pengguna</option>
                    <option value="role">Berdasarkan Role</option>
                  </select>
                </div>
                
                {targetType === 'role' && (
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Pilih Role</Label>
                    <select name="targetRole" className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      {roles.map((r) => (
                        <option key={r.value} value={r.value}>{r.label}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Catatan (Opsional)</Label>
                  <Textarea name="catatan" placeholder="Cth: Membawa buku nilai" className="h-20 resize-none text-sm" />
                </div>

                <SubmitBuatRapatBtn />
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {activeTab === 'masuk' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {undanganMasuk.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-400 dark:text-slate-500 bg-surface rounded-lg border border-surface">
              Tidak ada undangan rapat saat ini.
            </div>
          ) : (
            undanganMasuk.map((u, i) => (
              <div key={i} className="bg-surface border border-surface rounded-xl overflow-hidden flex flex-col">
                <div className="p-4 space-y-3 flex-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-tight truncate">{u.agenda}</h3>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">Pengundang: {u.pengundang_nama}</p>
                    </div>
                    <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded-full border uppercase shrink-0", getStatusBadge(u.status_kehadiran))}>
                      {u.status_kehadiran.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-1.5 text-xs text-slate-600 dark:text-slate-400">
                    <div className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-400" /> {u.tanggalFmt}</div>
                    <div className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" /> {u.waktu} WIB</div>
                    <div className="flex items-center gap-2"><MapPin className="h-3.5 w-3.5 text-slate-400" /> {u.tempat}</div>
                  </div>

                  {u.catatan && (
                    <div className="p-2.5 bg-surface-2 text-slate-700 dark:text-slate-300 text-[11px] rounded-lg border border-surface">
                      <strong className="text-slate-900 dark:text-slate-100 block mb-0.5 font-bold uppercase text-[9px]">Catatan:</strong> 
                      {u.catatan}
                    </div>
                  )}
                </div>

                <div className="p-3 bg-surface-2/50 border-t border-surface flex items-center gap-2">
                  {u.status_kehadiran === 'BELUM_RESPOND' ? (
                    <>
                      <Button 
                        size="sm"
                        onClick={() => handleKonfirmasi(u.peserta_id, 'HADIR')}
                        disabled={isConfirming === u.peserta_id}
                        className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
                      >
                       {isConfirming === u.peserta_id ? <Loader2 className="h-3 w-3 animate-spin mr-2"/> : <CheckCircle2 className="h-3 w-3 mr-2" />} Hadir
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            disabled={isConfirming === u.peserta_id}
                            className="flex-1 h-8 text-xs bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200 rounded-lg"
                          >
                            <XCircle className="h-3 w-3 mr-2" /> Berhalangan
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader><DialogTitle>Alasan Berhalangan</DialogTitle></DialogHeader>
                          <div className="space-y-3 pt-3">
                            <Textarea id={`alasan-${u.peserta_id}`} placeholder="Tuliskan alasannya..." className="min-h-[100px] text-sm"/>
                            <Button className="w-full h-10 bg-blue-600" onClick={() => {
                              const textarea = document.getElementById(`alasan-${u.peserta_id}`) as HTMLTextAreaElement
                              handleKonfirmasi(u.peserta_id, 'TIDAK_HADIR', textarea?.value)
                            }}>Simpan Konfirmasi</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : (
                    <div className={cn("w-full py-1.5 px-3 rounded-lg border text-center text-[11px] font-bold flex items-center justify-center gap-2", getStatusBadge(u.status_kehadiran))}>
                      {u.status_kehadiran === 'HADIR' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                      {u.status_kehadiran === 'HADIR' ? 'KONFIRMASI: ANDA HADIR' : `BERHALANGAN: ${u.alasan_tidak_hadir || '-'}`}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'dibuat' && canCreate && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {rapatDibuat.length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-400 dark:text-slate-500 bg-surface rounded-lg border border-surface">
              Anda belum membuat undangan rapat apapun.
            </div>
          ) : (
            rapatDibuat.map((r, i) => (
              <div key={i} className="bg-surface border border-surface rounded-xl p-4 flex flex-col gap-4">
                <div className="flex justify-between items-start gap-4">
                  <div className="min-w-0">
                    <h3 className="font-bold text-base text-slate-800 dark:text-slate-100 leading-tight truncate">{r.agenda}</h3>
                    <div className="mt-2 space-y-1">
                       <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Calendar className="h-3.5 w-3.5" /> {r.tanggalFmt}</span>
                       <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><Clock className="h-3.5 w-3.5" /> {r.waktu} WIB</span>
                       <span className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400"><MapPin className="h-3.5 w-3.5" /> {r.tempat}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 bg-surface-2 border border-surface rounded-lg p-2 min-w-[70px]">
                    <div className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Diundang</div>
                    <div className="text-xl font-black text-slate-700 dark:text-slate-200 leading-none mt-1">
                      {r.total_peserta}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-3 border-t border-surface">
                  <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-lg p-2 text-center border border-emerald-100 dark:border-emerald-800">
                    <div className="text-lg font-black text-emerald-600 dark:text-emerald-400">{r.total_hadir}</div>
                    <div className="text-[9px] font-bold text-emerald-800 dark:text-emerald-600 uppercase">Hadir</div>
                  </div>
                  <div className="bg-rose-50 dark:bg-rose-900/20 rounded-lg p-2 text-center border border-rose-100 dark:border-rose-800">
                     <div className="text-lg font-black text-rose-600 dark:text-rose-400">{r.total_tidak_hadir}</div>
                    <div className="text-[9px] font-bold text-rose-800 dark:text-rose-600 uppercase">Absen</div>
                  </div>
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2 text-center border border-amber-100 dark:border-amber-800">
                     <div className="text-lg font-black text-amber-600 dark:text-amber-400">{r.total_belum}</div>
                    <div className="text-[9px] font-bold text-amber-800 dark:text-amber-600 uppercase">Pending</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

    </div>
  )
}
