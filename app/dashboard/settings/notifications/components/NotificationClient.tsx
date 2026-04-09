'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Send, AlertCircle, CheckCircle2, Monitor, Key, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendCustomNotification } from '../actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

const initialState: any = {}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 mt-2">
      {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
      Kirim Broadcast Notifikasi
    </Button>
  )
}

export function NotificationClient({ roles = [], diagnostics }: { 
  roles: any[], 
  diagnostics?: { 
    totalDevices: number, 
    vapidKey: string,
    deviceList: any[]
  } 
}) {
  const [state, action] = useActionState(sendCustomNotification, initialState)
  const [targetType, setTargetType] = useState('role')

  return (
    <div className="space-y-4">
      {/* Broadcast Form Card */}
      <div className="rounded-xl border border-surface bg-surface p-4 sm:p-5 shadow-none">
        <form action={action} className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Send className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-tight">Form Broadcast</h3>
          </div>

          {state?.error && (
            <div className="p-3 text-sm text-rose-600 bg-rose-50 rounded-lg border border-rose-100 flex gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" /> {state.error}
            </div>
          )}
          {state?.success && (
            <div className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-100 flex gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5" /> {state.success}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5 flex-1">
              <Label className="text-xs font-medium text-slate-500">Judul Notifikasi</Label>
              <Input name="title" required placeholder="Cth: Pengumuman Rapat Dinas" className="h-9 text-sm rounded-lg" />
            </div>
            
            <div className="flex gap-3">
              <div className="space-y-1.5 flex-1">
                <Label className="text-xs font-medium text-slate-500">Target Penerima</Label>
                <select
                  name="targetType"
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value)}
                  className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">Semua Pengguna</option>
                  <option value="role">Berdasarkan Role</option>
                </select>
              </div>

              {targetType === 'role' && (
                <div className="space-y-1.5 flex-1">
                  <Label className="text-xs font-medium text-slate-500">Pilih Role</Label>
                  <select
                    name="targetRole"
                    className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {roles.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Isi Pesan / Body</Label>
            <Textarea name="body" required rows={3} placeholder="Tulis pesan lengkap di sini..." className="resize-none text-sm rounded-lg min-h-[80px]" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">URL Tujuan (Internal Path)</Label>
            <Input name="url" defaultValue="/dashboard" placeholder="/dashboard" className="h-9 text-sm rounded-lg" />
          </div>

          <SubmitBtn />
        </form>
      </div>

      {/* Diagnostics Section */}
      {diagnostics && (
        <div className="rounded-xl border border-surface bg-surface-2/30 p-4 sm:p-5">
          <div className="flex items-center gap-2 mb-4">
            <Monitor className="h-4 w-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Sistem Diagnostik</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
            <div className="bg-surface border border-surface rounded-xl p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">Total Subscriptions</p>
                <p className="text-xl font-black text-slate-900 dark:text-white leading-none">
                  {diagnostics.totalDevices} <span className="text-[10px] font-medium text-slate-400">Devices</span>
                </p>
              </div>
            </div>
            
            <div className="bg-surface border border-surface rounded-xl p-3 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center shrink-0">
                <Key className="h-5 w-5 text-violet-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold text-slate-400 uppercase leading-none mb-1">VAPID Key Status</p>
                <p className="text-[10px] font-mono text-slate-500 truncate bg-slate-50 dark:bg-slate-900 px-1 rounded border border-slate-100 py-0.5">
                  {diagnostics.vapidKey}
                </p>
              </div>
            </div>
          </div>

          {diagnostics.deviceList.length > 0 && (
            <div className="rounded-lg border border-surface bg-surface overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-2 hover:bg-surface-2">
                    <TableHead className="h-8 px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">User</TableHead>
                    <TableHead className="h-8 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Primary Role</TableHead>
                    <TableHead className="h-8 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Endpoint</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {diagnostics.deviceList.map((d, i) => (
                    <TableRow key={i} className="border-b border-surface-2 last:border-0 hover:bg-surface-2/50 transition-colors">
                      <TableCell className="px-3 py-2 text-xs font-semibold text-slate-800 dark:text-slate-100">{d.nama_lengkap || 'System'}</TableCell>
                      <TableCell className="px-3 py-2">
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-blue-100 bg-blue-50 text-blue-700 uppercase">
                          {d.primary_role}
                        </span>
                      </TableCell>
                      <TableCell className="px-3 py-2 text-[10px] font-mono text-slate-400 truncate max-w-[120px]">
                        ...{d.endpoint.slice(-8)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          <div className="mt-3 flex items-start gap-2 p-2 bg-amber-50/50 rounded-lg border border-amber-100 text-[10px] text-amber-700">
            <AlertCircle className="h-3 w-3 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              *Hanya menampilkan maks 5 langganan terakhir. Jika devices 0, berarti belum ada user yang mengaktifkan lonceng notifikasi di Profil mereka.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
