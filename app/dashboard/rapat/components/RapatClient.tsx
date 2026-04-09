'use client'

import { useState } from 'react'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { useRouter } from 'next/navigation'
import { Calendar, Clock, MapPin, Users, CheckCircle2, XCircle, AlertCircle, Plus, Send, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '../../../../components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { buatUndanganRapat, konfirmasiKehadiran } from '../actions'

const initialState: any = {}

function SubmitBuatRapatBtn() {
  const { pending } = useFormStatus()
  return (
    <Button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
      {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
      Buat & Kirim Undangan
    </Button>
  )
}

export function RapatClient({ undanganMasuk, rapatDibuat, canCreate }: { undanganMasuk: any[], rapatDibuat: any[], canCreate: boolean }) {
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

  return (
    <div className="space-y-6">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="bg-surface-2 border border-surface-3">
            <TabsTrigger value="masuk" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
              Undangan Masuk ({undanganMasuk.filter(u => u.status_kehadiran === 'BELUM_RESPOND').length})
            </TabsTrigger>
            {canCreate && (
              <TabsTrigger value="dibuat" className="data-[state=active]:bg-white data-[state=active]:text-blue-600">
                Rapat Buatan Saya ({rapatDibuat.length})
              </TabsTrigger>
            )}
          </TabsList>
        </Tabs>

        {canCreate && activeTab === 'dibuat' && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-blue-600 hover:bg-blue-700 text-white gap-2">
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
                  <Label>Agenda Rapat</Label>
                  <Input name="agenda" required placeholder="Cth: Rapat Pleno Kelulusan" />
                </div>
                
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tanggal</Label>
                    <Input name="tanggal" type="date" required defaultValue={new Date().toISOString().split('T')[0]} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Waktu</Label>
                    <Input name="waktu" type="time" required defaultValue="09:00" />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label>Tempat</Label>
                  <Input name="tempat" required placeholder="Cth: Ruang Guru" />
                </div>

                <div className="space-y-1.5">
                  <Label>Target Undangan</Label>
                  <select name="targetType" value={targetType} onChange={e => setTargetType(e.target.value)} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                    <option value="all">Semua Pengguna</option>
                    <option value="role">Berdasarkan Role</option>
                  </select>
                </div>
                
                {targetType === 'role' && (
                  <div className="space-y-1.5">
                    <Label>Pilih Role</Label>
                    <select name="targetRole" className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                      <option value="guru">Guru</option>
                      <option value="guru_piket">Guru Piket</option>
                      <option value="wali_kelas">Wali Kelas</option>
                    </select>
                  </div>
                )}

                <div className="space-y-1.5">
                  <Label>Catatan (Opsional)</Label>
                  <Textarea name="catatan" placeholder="Cth: Membawa buku nilai" className="h-20 resize-none" />
                </div>

                <SubmitBuatRapatBtn />
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {activeTab === 'masuk' && (
        <div className="grid gap-4 mt-6">
          {undanganMasuk.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-xl border-slate-200">
              <p className="text-slate-500">Tidak ada undangan rapat saat ini.</p>
            </div>
          ) : (
            undanganMasuk.map((u, i) => (
              <div key={i} className="flex flex-col md:flex-row gap-4 p-5 bg-white border border-slate-200 rounded-xl shadow-sm relative overflow-hidden group">
                <div className={`absolute top-0 left-0 w-1.5 h-full ${u.status_kehadiran === 'BELUM_RESPOND' ? 'bg-amber-400' : u.status_kehadiran === 'HADIR' ? 'bg-emerald-500' : 'bg-rose-500'}`}></div>
                
                <div className="flex-1 space-y-3 pl-3">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">{u.agenda}</h3>
                    <p className="text-xs text-slate-500 font-medium">Pengundang: {u.pengundang_nama}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5"><Calendar className="h-4 w-4 text-slate-400" /> {u.tanggalFmt}</div>
                    <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-slate-400" /> {u.waktu} WIB</div>
                    <div className="flex items-center gap-1.5"><MapPin className="h-4 w-4 text-slate-400" /> {u.tempat}</div>
                  </div>

                  {u.catatan && (
                    <div className="p-3 bg-slate-50 text-slate-700 text-sm rounded-lg border border-slate-100">
                      <strong>Catatan:</strong> {u.catatan}
                    </div>
                  )}
                </div>

                <div className="flex flex-col gap-2 min-w-[200px] border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-4 justify-center">
                  <p className="text-xs font-semibold text-slate-500 mb-1">Status Kehadiran Anda:</p>
                  {u.status_kehadiran === 'BELUM_RESPOND' ? (
                    <>
                      <Button 
                        onClick={() => handleKonfirmasi(u.peserta_id, 'HADIR')}
                        disabled={isConfirming === u.peserta_id}
                        className="w-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200"
                      >
                       {isConfirming === u.peserta_id ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="h-4 w-4 mr-2" />} Hadir
                      </Button>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            disabled={isConfirming === u.peserta_id}
                            variant="outline" 
                            className="w-full text-rose-600 hover:text-rose-700 hover:bg-rose-50 border-rose-200"
                          >
                            <XCircle className="h-4 w-4 mr-2" /> Berhalangan
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-sm">
                          <DialogHeader><DialogTitle>Alasan Berhalangan</DialogTitle></DialogHeader>
                          <div className="space-y-3 pt-3">
                            <Textarea id={`alasan-${u.peserta_id}`} placeholder="Tuliskan alasannya..." className="min-h-[100px]"/>
                            <Button className="w-full" onClick={() => {
                              const textarea = document.getElementById(`alasan-${u.peserta_id}`) as HTMLTextAreaElement
                              handleKonfirmasi(u.peserta_id, 'TIDAK_HADIR', textarea?.value)
                            }}>Simpan Konfirmasi</Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </>
                  ) : u.status_kehadiran === 'HADIR' ? (
                    <div className="flex items-center justify-center p-3 text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100 font-medium">
                      <CheckCircle2 className="h-5 w-5 mr-2" /> Anda Hadir
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-3 text-rose-700 bg-rose-50 rounded-lg border border-rose-100 font-medium text-center text-sm">
                      <div className="flex items-center mb-1"><XCircle className="h-5 w-5 mr-1" /> Berhalangan</div>
                      <span className="text-xs opacity-80">{u.alasan_tidak_hadir}</span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {activeTab === 'dibuat' && canCreate && (
        <div className="grid gap-4 mt-6">
          {rapatDibuat.length === 0 ? (
            <div className="text-center p-8 border border-dashed rounded-xl border-slate-200 text-slate-500">
              Anda belum membuat undangan rapat apapun.
            </div>
          ) : (
            rapatDibuat.map((r, i) => (
              <div key={i} className="bg-white border border-slate-200 rounded-xl shadow-sm p-5">
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-slate-800">{r.agenda}</h3>
                    <div className="flex flex-wrap gap-4 text-sm text-slate-500 mt-2">
                       <span className="flex items-center gap-1.5"><Calendar className="h-4 w-4" /> {r.tanggalFmt}</span>
                       <span className="flex items-center gap-1.5"><Clock className="h-4 w-4" /> {r.waktu} WIB</span>
                       <span className="flex items-center gap-1.5"><MapPin className="h-4 w-4" /> {r.tempat}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-400 mb-1">Total Diundang</div>
                    <div className="text-2xl font-bold font-mono text-slate-700 flex items-center justify-end gap-2">
                      <Users className="h-5 w-5 text-slate-400"/> {r.total_peserta}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-100">
                  <div className="bg-emerald-50 rounded-lg p-3 text-center border border-emerald-100">
                    <div className="text-xl font-bold text-emerald-600">{r.total_hadir}</div>
                    <div className="text-xs font-medium text-emerald-800">Hadir</div>
                  </div>
                  <div className="bg-rose-50 rounded-lg p-3 text-center border border-rose-100">
                     <div className="text-xl font-bold text-rose-600">{r.total_tidak_hadir}</div>
                    <div className="text-xs font-medium text-rose-800">Berhalangan</div>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center border border-amber-100">
                     <div className="text-xl font-bold text-amber-600">{r.total_belum}</div>
                    <div className="text-xs font-medium text-amber-800">Belum Jawab</div>
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
