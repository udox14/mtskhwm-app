'use client'

import { useActionState, useState, useCallback, useEffect } from 'react'
import { useFormStatus } from 'react-dom'
import { Loader2, Send, AlertCircle, CheckCircle2, Monitor, Key, Users, Search, Filter } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { sendCustomNotification } from '../actions'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'

// ============================================================
// Types
// ============================================================
type UserItem = { id: string; nama_lengkap: string; role: string; all_roles: string[] }
type RoleOption = { value: string; label: string }

const ROLE_LABEL: Record<string, string> = {
  super_admin: 'Super Admin', admin_tu: 'Admin TU', kepsek: 'Kepala Madrasah',
  wakamad: 'Wakamad', guru: 'Guru', guru_bk: 'Guru BK', guru_piket: 'Guru Piket',
  wali_kelas: 'Wali Kelas', resepsionis: 'Resepsionis', guru_ppl: 'Guru PPL',
}
const getRoleLabel = (r: string) => ROLE_LABEL[r] || r

// ============================================================
// Submit Button
// ============================================================
function SubmitBtn() {
  const { pending } = useFormStatus()
  return (
    <Button disabled={pending} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg h-10 mt-2">
      {pending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
      Kirim Broadcast Notifikasi
    </Button>
  )
}

// ============================================================
// Checkbox Peserta — sama persis dengan di rapat
// ============================================================
function CheckboxPeserta({
  allUsers, roles, selectedIds, setSelectedIds,
}: {
  allUsers: UserItem[]
  roles: RoleOption[]
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  const [search, setSearch] = useState('')
  const [filterRole, setFilterRole] = useState('_all')

  const filtered = allUsers.filter(u => {
    const matchRole = filterRole === '_all' || u.all_roles.includes(filterRole)
    const q = search.toLowerCase()
    const matchQ = !q || u.nama_lengkap.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    return matchRole && matchQ
  })

  const allFilteredIds = filtered.map(u => u.id)
  const allChecked = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.has(id))
  const someChecked = allFilteredIds.some(id => selectedIds.has(id))

  const toggleAll = () => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (allChecked) { allFilteredIds.forEach(id => next.delete(id)) }
      else { allFilteredIds.forEach(id => next.add(id)) }
      return next
    })
  }

  const toggle = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="space-y-2">
      {/* Search + Filter */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari nama..."
            className="h-8 pl-8 text-xs rounded-lg"
          />
        </div>
        <Select value={filterRole} onValueChange={setFilterRole}>
          <SelectTrigger className="h-8 w-36 text-xs rounded-lg">
            <Filter className="h-3 w-3 mr-1.5 text-slate-400" />
            <SelectValue placeholder="Semua Role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="_all" className="text-xs">Semua Role</SelectItem>
            {roles.map(r => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Select All */}
      <div className="flex items-center justify-between px-1">
        <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-600">
          <input
            type="checkbox"
            checked={allChecked}
            ref={el => { if (el) el.indeterminate = !allChecked && someChecked }}
            onChange={toggleAll}
            className="rounded"
          />
          Pilih Semua ({filtered.length} tampil dari {allUsers.length})
        </label>
        <span className="text-[10px] text-slate-400 font-medium">{selectedIds.size} dipilih</span>
      </div>

      {/* Scrollable List */}
      <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-y-auto max-h-48 divide-y divide-slate-100 dark:divide-slate-800">
        {filtered.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">Tidak ada pengguna ditemukan.</div>
        ) : (
          filtered.map(u => (
            <label key={u.id} className={cn(
              'flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors',
              selectedIds.has(u.id) && 'bg-blue-50/60 dark:bg-blue-900/20'
            )}>
              <input
                type="checkbox"
                checked={selectedIds.has(u.id)}
                onChange={() => toggle(u.id)}
                className="rounded shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-slate-800 dark:text-slate-100 truncate">{u.nama_lengkap}</p>
                <p className="text-[10px] text-slate-400">{getRoleLabel(u.role)}</p>
              </div>
            </label>
          ))
        )}
      </div>
    </div>
  )
}

// ============================================================
// Main Component
// ============================================================
export function NotificationClient({ roles = [], allUsers = [], diagnostics }: {
  roles: RoleOption[]
  allUsers: UserItem[]
  diagnostics?: {
    totalDevices: number
    vapidKey: string
    deviceList: any[]
  }
}) {
  const [state, action] = useActionState(sendCustomNotification, { error: '', success: '' } as { error?: string; success?: string })
  const [targetType, setTargetType] = useState('all')
  const [targetRole, setTargetRole] = useState(roles[0]?.value || '')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(allUsers.map(u => u.id)))

  const handleTargetTypeChange = useCallback((v: string) => {
    setTargetType(v)
    if (v === 'all') {
      setSelectedIds(new Set(allUsers.map(u => u.id)))
    } else if (v === 'role') {
      setSelectedIds(new Set(allUsers.filter(u => u.all_roles.includes(targetRole)).map(u => u.id)))
    } else {
      // custom: biarkan user pilih manual, mulai kosong
      setSelectedIds(new Set())
    }
  }, [allUsers, targetRole])

  const handleTargetRoleChange = useCallback((v: string) => {
    setTargetRole(v)
    setSelectedIds(new Set(allUsers.filter(u => u.all_roles.includes(v)).map(u => u.id)))
  }, [allUsers])

  return (
    <div className="space-y-4">
      {/* Broadcast Form Card */}
      <div className="rounded-xl border border-surface bg-surface p-4 sm:p-5 shadow-none">
        <form
          action={(fd) => {
            // Selalu kirim targetUserIds untuk semua mode agar backend handle
            fd.set('targetType', 'custom')
            fd.set('targetUserIds', JSON.stringify([...selectedIds]))
            return action(fd)
          }}
          className="space-y-4"
        >
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

          {/* Judul */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Judul Notifikasi</Label>
            <Input name="title" required placeholder="Cth: Pengumuman Rapat Dinas" className="h-9 text-sm rounded-lg" />
          </div>

          {/* Target cepat + role */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-slate-500">Preset Target</Label>
              <Select value={targetType} onValueChange={handleTargetTypeChange}>
                <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Pengguna</SelectItem>
                  <SelectItem value="role">Berdasarkan Role</SelectItem>
                  <SelectItem value="custom">Pilih Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'role' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-slate-500">Role</Label>
                <Select value={targetRole} onValueChange={handleTargetRoleChange}>
                  <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {roles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className={cn('space-y-1.5 col-span-2 sm:col-span-1', targetType === 'role' ? 'sm:col-span-1' : '')}>
              <Label className="text-xs font-medium text-slate-500 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Penerima
                <span className="text-slate-400 font-normal">({selectedIds.size} dipilih)</span>
              </Label>
            </div>
          </div>

          {/* Daftar Checkbox Penerima */}
          <CheckboxPeserta
            allUsers={allUsers}
            roles={roles}
            selectedIds={selectedIds}
            setSelectedIds={setSelectedIds}
          />

          {/* Isi Pesan */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium text-slate-500">Isi Pesan / Body</Label>
            <Textarea name="body" required rows={3} placeholder="Tulis pesan lengkap di sini..." className="resize-none text-sm rounded-lg min-h-[80px]" />
          </div>

          {/* URL */}
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
