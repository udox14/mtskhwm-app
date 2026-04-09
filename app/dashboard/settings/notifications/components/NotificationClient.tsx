'use client'

import { useActionState, useState } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '../../../../../components/ui/textarea'
import { sendCustomNotification } from '../actions'

const initialState: any = {}

function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button disabled={pending} className="w-full h-10 mt-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg">
      {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
      Kirim Broadcast
    </Button>
  )
}

export function NotificationClient({ roles = [] }: { roles: any[] }) {
  const [state, action] = useActionState(sendCustomNotification, initialState)
  const [targetType, setTargetType] = useState('role')

  return (
    <div className="rounded-xl border border-surface bg-surface p-6 shadow-sm">
      <form action={action} className="space-y-4">
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

        <div className="space-y-2">
          <Label className="text-sm font-medium">Judul Notifikasi</Label>
          <Input name="title" required placeholder="Contoh: Pengumuman Rapat Dinas" className="h-10" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">Isi Pesan / Body</Label>
          <Textarea name="body" required rows={3} placeholder="Contoh: Diharapkan bagi seluruh guru untuk hadir di ruang guru pada jam istirahat..." className="resize-none" />
        </div>

        <div className="space-y-2">
          <Label className="text-sm font-medium">URL Tujuan (Opsional)</Label>
          <Input name="url" defaultValue="/" placeholder="/dashboard atau URL lengkap" className="h-10" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Target Penerima</Label>
            <select
              name="targetType"
              value={targetType}
              onChange={(e) => setTargetType(e.target.value)}
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="all">Semua Pengguna</option>
              <option value="role">Berdasarkan Role</option>
            </select>
          </div>

          {targetType === 'role' && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Pilih Role</Label>
              <select
                name="targetRole"
                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {roles.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <SubmitBtn />
      </form>
    </div>
  )
}
