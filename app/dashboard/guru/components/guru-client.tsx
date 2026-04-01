'use client'

import { useState, useEffect } from 'react'
import Script from 'next/script'
import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Search, UserPlus, Trash2, ShieldAlert, Loader2, Mail, FileSpreadsheet,
  Download, KeyRound, Pencil, AlertCircle, Users, CheckCircle2,
  Building2, MapPin, PlusCircle, X
} from 'lucide-react'
import {
  tambahPegawai, ubahRolePegawai, hapusPegawai, importPegawaiMassal,
  editPegawai, resetPasswordPegawai,
  assignJabatanStruktural, setDomisiliPegawai,
  tambahJabatanStruktural, hapusJabatanStruktural, editJabatanStruktural
} from '../actions'
import { cn } from '@/lib/utils'

type JabatanType = { id: string, nama: string, urutan: number }
type ProfilType = {
  id: string, nama_lengkap: string, role: string, email: string,
  jabatan_struktural_id: string | null, jabatan_struktural_nama: string | null,
  domisili_pegawai: string | null
}

const ROLES = [
  { value: 'guru', label: 'Guru Mata Pelajaran' },
  { value: 'guru_bk', label: 'Guru BK' },
  { value: 'guru_piket', label: 'Guru Piket' },
  { value: 'wakamad', label: 'Wakil Kepala Madrasah' },
  { value: 'kepsek', label: 'Kepala Madrasah' },
  { value: 'admin_tu', label: 'Admin Tata Usaha' },
  { value: 'wali_kelas', label: 'Wali Kelas' },
  { value: 'resepsionis', label: 'Resepsionis' },
  { value: 'guru_ppl', label: 'Guru PPL' },
]

const initialState: any = { error: null, success: null }

function SubmitButton() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" disabled={pending} className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
      {pending ? <><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Membuat Akun...</> : 'Buat Akun Pegawai'}
    </Button>
  )
}

const getAvatarColor = (name: string) => {
  const colors = [
    'from-emerald-100 to-emerald-200 text-emerald-800',
    'from-teal-100 to-teal-200 text-teal-800',
    'from-cyan-100 to-cyan-200 text-cyan-800',
    'from-blue-100 to-blue-200 text-blue-800',
    'from-amber-100 to-amber-200 text-amber-800',
    'from-indigo-100 to-indigo-200 text-indigo-800',
  ]
  return colors[(name.charCodeAt(0) || 0) % colors.length]
}

export function GuruClient({ initialData, masterJabatan }: { initialData: ProfilType[], masterJabatan: JabatanType[] }) {
  const [isPending, setIsPending] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('ALL')
  const [filterJabatan, setFilterJabatan] = useState('ALL')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [editingPegawai, setEditingPegawai] = useState<ProfilType | null>(null)
  const [state, formAction] = useActionState(tambahPegawai, initialState)
  const [isImporting, setIsImporting] = useState(false)
  const [importLogs, setImportLogs] = useState<string[]>([])
  // Jabatan management
  const [isJabatanOpen, setIsJabatanOpen] = useState(false)
  const [newJabatan, setNewJabatan] = useState('')
  const [editingJabatan, setEditingJabatan] = useState<JabatanType | null>(null)
  const [editJabatanNama, setEditJabatanNama] = useState('')
  const [activeTab, setActiveTab] = useState('pegawai')

  useEffect(() => { setCurrentPage(1) }, [searchTerm, filterRole, filterJabatan, itemsPerPage])
  useEffect(() => {
    if (state?.success) { const t = setTimeout(() => setIsAddOpen(false), 2000); return () => clearTimeout(t) }
  }, [state?.success])

  const filteredData = initialData.filter(p => {
    const matchSearch = p.nama_lengkap.toLowerCase().includes(searchTerm.toLowerCase()) || p.email.toLowerCase().includes(searchTerm.toLowerCase())
    const matchRole = filterRole === 'ALL' || p.role === filterRole
    const matchJabatan = filterJabatan === 'ALL'
      ? true
      : filterJabatan === 'NONE'
        ? !p.jabatan_struktural_id
        : p.jabatan_struktural_id === filterJabatan
    return matchSearch && matchRole && matchJabatan
  })

  const totalPages = Math.ceil(filteredData.length / itemsPerPage)
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)

  const handleUbahRole = async (id: string, newRole: string) => {
    if (!confirm('Yakin ubah hak akses pegawai ini?')) return
    setIsPending(true)
    const res = await ubahRolePegawai(id, newRole)
    if (res?.error) alert(res.error)
    setIsPending(false)
  }

  const handleHapus = async (id: string, nama: string) => {
    if (!confirm(`PERMANEN!\nYakin hapus semua data dan akses login ${nama}?`)) return
    setIsPending(true)
    const res = await hapusPegawai(id)
    if (res?.error) alert(res.error)
    setIsPending(false)
  }

  const handleResetPassword = async (id: string, nama: string) => {
    if (!confirm(`Reset password ${nama} ke "mtskhwm2026"?`)) return
    setIsPending(true)
    const res = await resetPasswordPegawai(id)
    if (res?.error) alert(res.error)
    else alert(res.success)
    setIsPending(false)
  }

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setIsPending(true)
    const formData = new FormData(e.currentTarget)
    const res = await editPegawai(formData.get('id') as string, formData.get('nama_lengkap') as string, formData.get('email') as string)
    if (res?.error) alert(res.error)
    else { alert(res.success); setEditingPegawai(null) }
    setIsPending(false)
  }

  const handleAssignJabatan = async (userId: string, jabatanId: string) => {
    setIsPending(true)
    const val = jabatanId === 'NONE' ? null : jabatanId
    const res = await assignJabatanStruktural(userId, val)
    if (res?.error) alert(res.error)
    setIsPending(false)
  }

  const handleSetDomisili = async (userId: string, domisili: string) => {
    setIsPending(true)
    const val = domisili === 'NONE' ? null : domisili
    const res = await setDomisiliPegawai(userId, val)
    if (res?.error) alert(res.error)
    setIsPending(false)
  }

  const handleTambahJabatan = async () => {
    if (!newJabatan.trim()) return
    setIsPending(true)
    const res = await tambahJabatanStruktural(newJabatan)
    if (res?.error) alert(res.error)
    else setNewJabatan('')
    setIsPending(false)
  }

  const handleHapusJabatan = async (id: string, nama: string) => {
    if (!confirm(`Hapus jabatan "${nama}"? Pegawai yang menjabat akan di-unset.`)) return
    setIsPending(true)
    const res = await hapusJabatanStruktural(id)
    if (res?.error) alert(res.error)
    setIsPending(false)
  }

  const handleEditJabatan = async () => {
    if (!editingJabatan || !editJabatanNama.trim()) return
    setIsPending(true)
    const res = await editJabatanStruktural(editingJabatan.id, editJabatanNama)
    if (res?.error) alert(res.error)
    else setEditingJabatan(null)
    setIsPending(false)
  }

  const handleDownloadTemplate = () => {
    const XLSX = (window as any).XLSX
    if (!XLSX) return alert('Library belum siap.')
    const ws = XLSX.utils.json_to_sheet([
      { NAMA_LENGKAP: 'Budi Santoso, S.Pd', EMAIL: 'budi@mtskhwm.sch.id', JABATAN: 'guru' },
      { NAMA_LENGKAP: 'Siti Aminah, M.Pd', EMAIL: 'siti@mtskhwm.sch.id', JABATAN: 'wakamad' },
    ])
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Data_Pegawai')
    XLSX.writeFile(wb, 'Template_Import_Pegawai.xlsx')
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsImporting(true); setImportLogs([])
    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const XLSX = (window as any).XLSX
        const workbook = XLSX.read(event.target?.result, { type: 'binary' })
        const jsonData = XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]])
        const result = await importPegawaiMassal(jsonData) as any
        if (result.error) alert(result.error)
        else alert(result.success)
        if (result.logs?.length > 0) setImportLogs(result.logs)
      } catch { alert('Gagal membaca file Excel.') }
      finally { setIsImporting(false); e.target.value = '' }
    }
    reader.readAsBinaryString(file)
  }

  // ---- Count pegawai punya jabatan struktural ----
  const pegawaiStruktural = initialData.filter(p => p.jabatan_struktural_id)

  return (
    <>
      <Script src="https://cdn.sheetjs.com/xlsx-0.20.1/package/dist/xlsx.full.min.js" strategy="lazyOnload" />

      {/* MODAL EDIT PROFIL */}
      <Dialog open={!!editingPegawai} onOpenChange={open => !open && setEditingPegawai(null)}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader className="border-b pb-3"><DialogTitle className="text-sm font-semibold">Edit Profil Pegawai</DialogTitle></DialogHeader>
          <form onSubmit={handleEditSubmit} className="space-y-3 pt-1">
            <input type="hidden" name="id" value={editingPegawai?.id} />
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Lengkap</Label>
              <Input name="nama_lengkap" defaultValue={editingPegawai?.nama_lengkap} required className="h-9 text-sm rounded-lg" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email (Login)</Label>
              <Input type="email" name="email" defaultValue={editingPegawai?.email} required className="h-9 text-sm rounded-lg" />
            </div>
            <Button type="submit" disabled={isPending} className="w-full h-9 text-sm bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg">
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Perubahan'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* MODAL KELOLA JABATAN STRUKTURAL */}
      <Dialog open={isJabatanOpen} onOpenChange={setIsJabatanOpen}>
        <DialogContent className="sm:max-w-md rounded-xl">
          <DialogHeader className="border-b pb-3">
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <Building2 className="h-4 w-4 text-violet-500" /> Kelola Master Jabatan Struktural
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            {/* Tambah jabatan baru */}
            <div className="flex gap-2">
              <Input
                placeholder="Nama jabatan baru..."
                value={newJabatan}
                onChange={e => setNewJabatan(e.target.value)}
                className="h-8 text-sm rounded-md flex-1"
                onKeyDown={e => e.key === 'Enter' && handleTambahJabatan()}
              />
              <Button size="sm" onClick={handleTambahJabatan} disabled={isPending || !newJabatan.trim()} className="h-8 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">
                <PlusCircle className="h-3.5 w-3.5 mr-1" /> Tambah
              </Button>
            </div>

            {/* Daftar jabatan */}
            <div className="space-y-1.5">
              {masterJabatan.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Belum ada jabatan struktural.</p>
              ) : masterJabatan.map(j => (
                <div key={j.id} className="flex items-center gap-2 bg-surface-2 border border-surface rounded-lg px-3 py-2">
                  {editingJabatan?.id === j.id ? (
                    <>
                      <Input
                        value={editJabatanNama}
                        onChange={e => setEditJabatanNama(e.target.value)}
                        className="h-7 text-xs flex-1 rounded-md"
                        onKeyDown={e => e.key === 'Enter' && handleEditJabatan()}
                      />
                      <Button size="sm" onClick={handleEditJabatan} disabled={isPending} className="h-7 text-xs px-2 bg-emerald-600 text-white rounded-md">OK</Button>
                      <button onClick={() => setEditingJabatan(null)} className="p-1 text-slate-400 hover:text-slate-600"><X className="h-3.5 w-3.5" /></button>
                    </>
                  ) : (
                    <>
                      <Building2 className="h-3.5 w-3.5 text-violet-500 shrink-0" />
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 flex-1">{j.nama}</span>
                      <span className="text-[10px] text-slate-400 bg-surface px-1.5 py-0.5 rounded border border-surface">
                        {initialData.filter(p => p.jabatan_struktural_id === j.id).length} orang
                      </span>
                      <button onClick={() => { setEditingJabatan(j); setEditJabatanNama(j.nama) }} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded" title="Edit">
                        <Pencil className="h-3 w-3" />
                      </button>
                      <button onClick={() => handleHapusJabatan(j.id, j.nama)} className="p-1 text-rose-500 hover:bg-rose-50 rounded" title="Hapus">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <div className="space-y-3">
        {/* TABS: Pegawai / Jabatan Struktural Info */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-surface border border-surface">
            <TabsTrigger value="pegawai" className="text-xs gap-1.5 data-[state=active]:bg-emerald-50 data-[state=active]:text-emerald-700">
              <Users className="h-3.5 w-3.5" /> Semua Pegawai ({initialData.length})
            </TabsTrigger>
            <TabsTrigger value="struktural" className="text-xs gap-1.5 data-[state=active]:bg-violet-50 data-[state=active]:text-violet-700">
              <Building2 className="h-3.5 w-3.5" /> Pejabat Struktural ({pegawaiStruktural.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="struktural" className="mt-3 space-y-3">
            {/* Info card struktural */}
            <div className="flex items-center justify-between bg-surface border border-surface rounded-lg p-3">
              <p className="text-xs text-slate-500">Pegawai dengan jabatan struktural wajib presensi harian via resepsionis.</p>
              <Button size="sm" variant="outline" onClick={() => setIsJabatanOpen(true)} className="h-7 text-xs gap-1 rounded-md">
                <Building2 className="h-3 w-3" /> Kelola Jabatan
              </Button>
            </div>
            {/* Grid card struktural */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {pegawaiStruktural.length === 0 ? (
                <div className="col-span-full bg-surface py-10 rounded-lg border border-surface text-center">
                  <Building2 className="h-7 w-7 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-400">Belum ada pegawai dengan jabatan struktural.</p>
                  <p className="text-xs text-slate-400 mt-1">Assign jabatan di tab &quot;Semua Pegawai&quot;.</p>
                </div>
              ) : pegawaiStruktural.map(p => (
                <div key={p.id} className="bg-surface border border-surface rounded-lg p-3">
                  <div className="flex items-center gap-2.5 mb-2">
                    <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center text-sm font-bold", getAvatarColor(p.nama_lengkap))}>
                      {p.nama_lengkap.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{p.nama_lengkap}</p>
                      <p className="text-[10px] text-slate-400 truncate">{p.email}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-violet-100 text-violet-700 border border-violet-200">
                      <Building2 className="h-2.5 w-2.5" />{p.jabatan_struktural_nama}
                    </span>
                    {p.domisili_pegawai && (
                      <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold border",
                        p.domisili_pegawai === 'dalam' ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-amber-100 text-amber-700 border-amber-200'
                      )}>
                        <MapPin className="h-2.5 w-2.5" />{p.domisili_pegawai === 'dalam' ? 'Dalam' : 'Luar'}
                      </span>
                    )}
                    {!p.domisili_pegawai && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 text-rose-500 border border-rose-200">
                        <MapPin className="h-2.5 w-2.5" />Domisili belum diset
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="pegawai" className="mt-3 space-y-3">
            {/* TOOLBAR */}
            <div className="bg-surface border border-surface rounded-lg p-3 flex flex-wrap gap-2 items-center">
              <div className="relative flex-1 min-w-0" style={{ minWidth: '140px' }}>
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                <Input placeholder="Cari nama atau email..." className="pl-8 h-8 text-sm rounded-md" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
              </div>
              <Select value={filterRole} onValueChange={setFilterRole}>
                <SelectTrigger className="h-8 w-36 sm:w-40 text-xs rounded-md shrink-0"><SelectValue placeholder="Semua Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Role</SelectItem>
                  {ROLES.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterJabatan} onValueChange={setFilterJabatan}>
                <SelectTrigger className="h-8 w-36 sm:w-44 text-xs rounded-md shrink-0"><SelectValue placeholder="Semua Jabatan" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Semua Jabatan</SelectItem>
                  <SelectItem value="NONE">Tanpa Jabatan Struktural</SelectItem>
                  {masterJabatan.map(j => <SelectItem key={j.id} value={j.id}>{j.nama}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="flex gap-2 ml-auto">
                <Button variant="outline" size="sm" onClick={() => setIsJabatanOpen(true)} className="h-8 text-xs rounded-md gap-1">
                  <Building2 className="h-3.5 w-3.5" /> Jabatan
                </Button>
                {/* Import Dialog */}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 text-xs rounded-md">
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-1" /> Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-lg rounded-xl">
                    <DialogHeader className="border-b pb-3"><DialogTitle className="text-sm font-semibold">Import Akun Pegawai Massal</DialogTitle></DialogHeader>
                    <div className="space-y-3 pt-2">
                      <div className="flex justify-between items-center p-2.5 bg-surface-2 border border-surface rounded-lg">
                        <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">Download format template:</p>
                        <Button size="sm" variant="outline" onClick={handleDownloadTemplate} className="h-7 text-xs gap-1"><Download className="h-3 w-3" />Template</Button>
                      </div>
                      <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-xs text-emerald-800 space-y-1">
                        <p className="flex items-center gap-1.5 font-medium"><KeyRound className="h-3.5 w-3.5 text-emerald-600" />Password otomatis: <strong className="font-mono bg-surface px-1.5 py-0.5 rounded border border-emerald-200">mtskhwm2026</strong></p>
                        <p>Kolom: <strong>NAMA_LENGKAP</strong>, <strong>EMAIL</strong>, <strong>JABATAN</strong></p>
                      </div>
                      <Input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} disabled={isImporting} className="h-9 text-xs rounded-lg cursor-pointer" />
                      {isImporting && <div className="flex items-center text-xs font-medium text-emerald-600 bg-emerald-50 p-2.5 rounded-lg animate-pulse"><Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />Sedang membuat akun...</div>}
                      {importLogs.length > 0 && (
                        <div className="border border-rose-200 rounded-lg overflow-hidden">
                          <div className="bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 flex items-center gap-1.5"><AlertCircle className="h-3.5 w-3.5" />Log Gagal:</div>
                          <ScrollArea className="h-28 bg-surface p-3 text-xs font-mono text-rose-600">
                            {importLogs.map((log, i) => <div key={i} className="mb-0.5">{log}</div>)}
                          </ScrollArea>
                        </div>
                      )}
                    </div>
                  </DialogContent>
                </Dialog>

                {/* Tambah Manual */}
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="h-8 text-xs rounded-md bg-emerald-600 hover:bg-emerald-700 text-white">
                      <UserPlus className="h-3.5 w-3.5 mr-1" /> Tambah
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md rounded-xl">
                    <DialogHeader className="border-b pb-3"><DialogTitle className="text-sm font-semibold">Buat Akun Pegawai Baru</DialogTitle></DialogHeader>
                    <form action={formAction} className="space-y-3 pt-2">
                      {state?.error && <div className="p-2.5 text-xs text-rose-600 bg-rose-50 rounded-lg border border-rose-200 flex gap-1.5"><AlertCircle className="h-3.5 w-3.5 shrink-0" />{state.error}</div>}
                      {state?.success && <div className="p-2.5 text-xs text-emerald-700 bg-emerald-50 rounded-lg border border-emerald-200 flex gap-1.5"><CheckCircle2 className="h-3.5 w-3.5 shrink-0" />{state.success}</div>}
                      <div className="bg-emerald-50 border border-emerald-100 p-2.5 rounded-lg flex gap-2 text-xs text-emerald-800">
                        <ShieldAlert className="h-3.5 w-3.5 shrink-0 text-emerald-600 mt-0.5" />
                        Password default: <strong className="font-mono bg-surface px-1 py-0.5 rounded border border-emerald-200">mtskhwm2026</strong>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Nama Lengkap <span className="text-rose-500">*</span></Label>
                        <Input name="nama_lengkap" required className="h-9 text-sm rounded-lg" placeholder="Contoh: Budi Santoso, S.Pd" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Email Resmi <span className="text-rose-500">*</span></Label>
                        <div className="relative">
                          <Mail className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                          <Input name="email" type="email" required className="pl-8 h-9 text-sm rounded-lg" placeholder="guru@mtskhwm.sch.id" />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Jabatan <span className="text-rose-500">*</span></Label>
                        <Select name="role" defaultValue="guru">
                          <SelectTrigger className="h-9 text-xs rounded-lg"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <SubmitButton />
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* MOBILE CARDS */}
            <div className="block md:hidden space-y-2">
              {paginatedData.length === 0 ? (
                <div className="bg-surface py-10 rounded-lg border border-surface text-center">
                  <Users className="h-7 w-7 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                  <p className="text-sm text-slate-400 dark:text-slate-500">Tidak ada data pegawai.</p>
                </div>
              ) : paginatedData.map(p => (
                <div key={p.id} className="bg-surface border border-surface rounded-lg p-3">
                  <div className="flex items-center gap-3 mb-2.5">
                    <div className={cn("h-9 w-9 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center text-sm font-bold", getAvatarColor(p.nama_lengkap))}>
                      {p.nama_lengkap.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate leading-tight">{p.nama_lengkap}</p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate flex items-center gap-0.5 mt-0.5"><Mail className="h-2.5 w-2.5" />{p.email}</p>
                    </div>
                  </div>
                  {/* Role */}
                  <Select value={p.role} onValueChange={val => handleUbahRole(p.id, val)} disabled={isPending}>
                    <SelectTrigger className="h-7 text-xs rounded border-surface bg-surface-2 font-medium w-full mb-2"><SelectValue /></SelectTrigger>
                    <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}</SelectContent>
                  </Select>
                  {/* Jabatan + Domisili */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <Select value={p.jabatan_struktural_id || 'NONE'} onValueChange={val => handleAssignJabatan(p.id, val)} disabled={isPending}>
                      <SelectTrigger className="h-7 text-[10px] rounded border-surface bg-surface-2"><SelectValue placeholder="Jabatan Struktural" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE" className="text-xs">— Tidak ada —</SelectItem>
                        {masterJabatan.map(j => <SelectItem key={j.id} value={j.id} className="text-xs">{j.nama}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={p.domisili_pegawai || 'NONE'} onValueChange={val => handleSetDomisili(p.id, val)} disabled={isPending}>
                      <SelectTrigger className="h-7 text-[10px] rounded border-surface bg-surface-2"><SelectValue placeholder="Domisili" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE" className="text-xs">— Belum diset —</SelectItem>
                        <SelectItem value="dalam" className="text-xs">Dalam</SelectItem>
                        <SelectItem value="luar" className="text-xs">Luar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-1.5 justify-end">
                    <button onClick={() => handleResetPassword(p.id, p.nama_lengkap)} disabled={isPending} className="p-1.5 rounded text-amber-600 hover:bg-amber-50" title="Reset Password">
                      <KeyRound className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => setEditingPegawai(p)} disabled={isPending} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50" title="Edit">
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button onClick={() => handleHapus(p.id, p.nama_lengkap)} disabled={isPending} className="p-1.5 rounded text-rose-500 hover:bg-rose-50" title="Hapus">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* DESKTOP TABLE */}
            <div className="hidden md:block bg-surface rounded-lg border border-surface overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-surface-2 hover:bg-surface-2">
                    <TableHead className="h-9 px-4 text-xs font-semibold text-slate-500 dark:text-slate-400">Profil Pegawai</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-slate-500 dark:text-slate-400 w-44">Role / Hak Akses</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-slate-500 dark:text-slate-400 w-44">Jabatan Struktural</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-slate-500 dark:text-slate-400 w-28">Domisili</TableHead>
                    <TableHead className="h-9 text-xs font-semibold text-slate-500 dark:text-slate-400 text-right px-4 w-28">Kelola</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        <div className="flex flex-col items-center gap-2 text-slate-400 dark:text-slate-500">
                          <Users className="h-7 w-7 text-slate-300 dark:text-slate-600" />
                          <p className="text-sm">Tidak ada data pegawai.</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : paginatedData.map(p => (
                    <TableRow key={p.id} className="hover:bg-emerald-50/20 border-surface-2 group">
                      <TableCell className="px-4 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={cn("h-8 w-8 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center text-sm font-bold", getAvatarColor(p.nama_lengkap))}>
                            {p.nama_lengkap.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 group-hover:text-emerald-700 transition-colors leading-tight">{p.nama_lengkap}</p>
                            <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-0.5 mt-0.5"><Mail className="h-2.5 w-2.5" />{p.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Select value={p.role} onValueChange={val => handleUbahRole(p.id, val)} disabled={isPending}>
                          <SelectTrigger className="h-7 w-40 text-xs rounded border-surface bg-surface-2 font-medium"><SelectValue /></SelectTrigger>
                          <SelectContent>{ROLES.map(r => <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Select value={p.jabatan_struktural_id || 'NONE'} onValueChange={val => handleAssignJabatan(p.id, val)} disabled={isPending}>
                          <SelectTrigger className={cn("h-7 w-40 text-xs rounded border-surface font-medium",
                            p.jabatan_struktural_id ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-surface-2'
                          )}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE" className="text-xs">— Tidak ada —</SelectItem>
                            {masterJabatan.map(j => <SelectItem key={j.id} value={j.id} className="text-xs">{j.nama}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-2.5">
                        <Select value={p.domisili_pegawai || 'NONE'} onValueChange={val => handleSetDomisili(p.id, val)} disabled={isPending}>
                          <SelectTrigger className={cn("h-7 w-24 text-xs rounded border-surface font-medium",
                            p.domisili_pegawai === 'dalam' ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : p.domisili_pegawai === 'luar' ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-surface-2'
                          )}><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="NONE" className="text-xs">— Belum —</SelectItem>
                            <SelectItem value="dalam" className="text-xs">Dalam</SelectItem>
                            <SelectItem value="luar" className="text-xs">Luar</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleResetPassword(p.id, p.nama_lengkap)} disabled={isPending} className="p-1.5 rounded text-amber-600 hover:bg-amber-50" title="Reset Password">
                            <KeyRound className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => setEditingPegawai(p)} disabled={isPending} className="p-1.5 rounded text-emerald-600 hover:bg-emerald-50" title="Edit">
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                          <button onClick={() => handleHapus(p.id, p.nama_lengkap)} disabled={isPending} className="p-1.5 rounded text-rose-500 hover:bg-rose-50" title="Hapus">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* PAGINATION */}
              <div className="flex items-center justify-between px-4 py-2 border-t border-surface-2 bg-slate-50/50">
                <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <span>Tampilkan</span>
                  <Select value={itemsPerPage.toString()} onValueChange={v => { setItemsPerPage(Number(v)); setCurrentPage(1) }}>
                    <SelectTrigger className="h-7 w-16 text-xs rounded border-surface"><SelectValue /></SelectTrigger>
                    <SelectContent>{[10, 20, 50].map(n => <SelectItem key={n} value={n.toString()}>{n}</SelectItem>)}</SelectContent>
                  </Select>
                  <span><strong className="text-slate-700 dark:text-slate-200">{filteredData.length}</strong> pegawai</span>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 px-2.5 text-xs rounded">&#8592;</Button>
                  <span className="text-xs font-medium px-2">{currentPage}/{totalPages || 1}</span>
                  <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-7 px-2.5 text-xs rounded">&#8594;</Button>
                </div>
              </div>
            </div>

            {/* Mobile pagination */}
            <div className="flex items-center justify-between md:hidden bg-surface border border-surface rounded-lg px-3 py-2">
              <span className="text-xs text-slate-500 dark:text-slate-400"><strong>{filteredData.length}</strong> pegawai</span>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-7 px-2.5 text-xs rounded">&#8592;</Button>
                <span className="text-xs font-medium px-2">{currentPage}/{totalPages || 1}</span>
                <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage >= totalPages} className="h-7 px-2.5 text-xs rounded">&#8594;</Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </>
  )
}
