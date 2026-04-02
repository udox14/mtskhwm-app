// Lokasi: app/dashboard/program-unggulan/kelola/components/admin-client.tsx
'use client'

import { useState, useCallback, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Star, Users, BookOpenCheck, BarChart3, FileText, Plus, Trash2, Edit3,
  Loader2, AlertCircle, CheckCircle2, School, UserPlus, ChevronDown, ChevronUp,
  Save, Eye, EyeOff, Upload, Image as ImageIcon, Music, X, Printer,
  Table as TableIcon, Bold, Italic, Underline, List, ListOrdered, Heading2,
  ArrowUp, ArrowDown, Search, Calendar, Filter, Download
} from 'lucide-react'
import {
  getKelasUnggulanAdmin, tambahKelasUnggulan, hapusKelasUnggulan,
  getGuruKelasByPuKelas, tambahGuruKelas, editJamMengajar, hapusGuruKelas,
  suggestGuruFromPenugasan,
  getMateriAdmin, tambahMateri, editMateri, hapusMateri, uploadMateriMedia,
  getMonitoringData, getLaporanData,
  getAllKelasForDropdown, getAllGuruForDropdown
} from '../actions'

// ── Types ────────────────────────────────────────────────────
type KelasUnggulan = { id: string; kelas_id: string; tingkat: number; nomor_kelas: string; kelompok: string }
type GuruKelas = { id: string; guru_id: string; guru_nama: string; jam_mengajar: number; pu_kelas_id: string }
type KelasOption = { id: string; tingkat: number; nomor_kelas: string; kelompok: string }
type GuruOption = { id: string; nama_lengkap: string }
type MateriItem = { id: string; judul: string; konten: string; urutan: number; is_active: number; pu_kelas_id: string; kelas_label?: string }

type Props = {
  initialKelas: KelasUnggulan[]
  allKelas: KelasOption[]
  allGuru: GuruOption[]
}

const JAM_OPTIONS = [
  { value: 1, label: '1 jam → 1 siswa' },
  { value: 2, label: '2 jam → 3 siswa' },
  { value: 3, label: '3 jam → 4 siswa' },
  { value: 4, label: '4 jam → 5 siswa' },
]

// ── Main Component ───────────────────────────────────────────
export function AdminClient({ initialKelas, allKelas, allGuru }: Props) {
  const [kelasList, setKelasList] = useState<KelasUnggulan[]>(initialKelas)
  const [activeTab, setActiveTab] = useState('kelas')

  const refreshKelas = useCallback(async () => {
    const res = await getKelasUnggulanAdmin()
    if (res.data) setKelasList(res.data)
  }, [])

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
      <TabsList className="grid grid-cols-4 w-full">
        <TabsTrigger value="kelas" className="text-xs sm:text-sm gap-1">
          <School className="w-3.5 h-3.5 hidden sm:block" />Kelas & Guru
        </TabsTrigger>
        <TabsTrigger value="materi" className="text-xs sm:text-sm gap-1">
          <BookOpenCheck className="w-3.5 h-3.5 hidden sm:block" />Materi
        </TabsTrigger>
        <TabsTrigger value="monitoring" className="text-xs sm:text-sm gap-1">
          <BarChart3 className="w-3.5 h-3.5 hidden sm:block" />Monitoring
        </TabsTrigger>
        <TabsTrigger value="laporan" className="text-xs sm:text-sm gap-1">
          <FileText className="w-3.5 h-3.5 hidden sm:block" />Laporan
        </TabsTrigger>
      </TabsList>

      <TabsContent value="kelas">
        <TabKelasGuru kelasList={kelasList} allKelas={allKelas} allGuru={allGuru} onRefresh={refreshKelas} />
      </TabsContent>
      <TabsContent value="materi">
        <TabMateri kelasList={kelasList} />
      </TabsContent>
      <TabsContent value="monitoring">
        <TabMonitoring kelasList={kelasList} />
      </TabsContent>
      <TabsContent value="laporan">
        <TabLaporan kelasList={kelasList} />
      </TabsContent>
    </Tabs>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 1: KELAS & GURU ASSIGNMENT
// ══════════════════════════════════════════════════════════════
function TabKelasGuru({ kelasList, allKelas, allGuru, onRefresh }: {
  kelasList: KelasUnggulan[]; allKelas: KelasOption[]; allGuru: GuruOption[]
  onRefresh: () => void
}) {
  const [addKelasId, setAddKelasId] = useState('')
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  const availableKelas = allKelas.filter(k => !kelasList.some(uk => uk.kelas_id === k.id))

  const handleTambahKelas = async () => {
    if (!addKelasId) return
    setSaving(true); setMsg(null)
    const res = await tambahKelasUnggulan(addKelasId)
    if ('error' in res && res.error) setMsg({ type: 'err', text: res.error })
    else { setMsg({ type: 'ok', text: res.success || '' }); setAddKelasId(''); onRefresh() }
    setSaving(false)
  }

  const handleHapusKelas = async (id: string) => {
    if (!confirm('Hapus kelas unggulan ini? Semua data guru, materi, dan hasil tes terkait akan ikut terhapus.')) return
    setSaving(true)
    const res = await hapusKelasUnggulan(id)
    if ('error' in res && res.error) setMsg({ type: 'err', text: res.error })
    else { setMsg({ type: 'ok', text: res.success || '' }); onRefresh() }
    setSaving(false)
  }

  return (
    <div className="space-y-4">
      {/* Tambah Kelas */}
      <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 space-y-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Plus className="w-4 h-4 text-emerald-500" />Tambah Kelas Unggulan
        </h3>
        <div className="flex gap-2">
          <Select value={addKelasId} onValueChange={setAddKelasId}>
            <SelectTrigger className="flex-1">
              <SelectValue placeholder="Pilih kelas..." />
            </SelectTrigger>
            <SelectContent>
              {availableKelas.map(k => (
                <SelectItem key={k.id} value={k.id}>
                  {k.tingkat}-{k.nomor_kelas} {k.kelompok}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={handleTambahKelas} disabled={!addKelasId || saving} size="sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          </Button>
        </div>
        <MsgBanner msg={msg} />
      </div>

      {/* Daftar Kelas */}
      {kelasList.length === 0 ? (
        <EmptyState text="Belum ada kelas unggulan" />
      ) : (
        <div className="space-y-3">
          {kelasList.map(k => (
            <KelasCard
              key={k.id}
              kelas={k}
              allGuru={allGuru}
              isExpanded={expanded === k.id}
              onToggle={() => setExpanded(expanded === k.id ? null : k.id)}
              onDelete={() => handleHapusKelas(k.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function KelasCard({ kelas, allGuru, isExpanded, onToggle, onDelete }: {
  kelas: KelasUnggulan; allGuru: GuruOption[]
  isExpanded: boolean; onToggle: () => void; onDelete: () => void
}) {
  const [guruList, setGuruList] = useState<GuruKelas[]>([])
  const [suggestions, setSuggestions] = useState<{ guru_id: string; guru_nama: string; total_jam: number }[]>([])
  const [addGuruId, setAddGuruId] = useState('')
  const [addJam, setAddJam] = useState(2)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (isExpanded) {
      setLoading(true)
      Promise.all([
        getGuruKelasByPuKelas(kelas.id),
        suggestGuruFromPenugasan(kelas.kelas_id)
      ]).then(([guru, suggest]) => {
        setGuruList(guru)
        setSuggestions(suggest)
      }).finally(() => setLoading(false))
    }
  }, [isExpanded, kelas.id, kelas.kelas_id])

  const handleAddGuru = async () => {
    if (!addGuruId) return
    setSaving(true)
    const res = await tambahGuruKelas(kelas.id, addGuruId, addJam)
    if (!('error' in res && res.error)) {
      setAddGuruId('')
      const updated = await getGuruKelasByPuKelas(kelas.id)
      setGuruList(updated)
    }
    setSaving(false)
  }

  const handleEditJam = async (id: string, jam: number) => {
    await editJamMengajar(id, jam)
    setGuruList(prev => prev.map(g => g.id === id ? { ...g, jam_mengajar: jam } : g))
  }

  const handleDeleteGuru = async (id: string) => {
    if (!confirm('Hapus guru dari kelas unggulan ini?')) return
    await hapusGuruKelas(id)
    setGuruList(prev => prev.filter(g => g.id !== id))
  }

  const assignedGuruIds = new Set(guruList.map(g => g.guru_id))
  const availableGuru = allGuru.filter(g => !assignedGuruIds.has(g.id))

  return (
    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 overflow-hidden">
      {/* Header */}
      <button onClick={onToggle} className="w-full flex items-center gap-3 p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition text-left">
        <div className="w-10 h-10 rounded-lg bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
          <Star className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm">{kelas.tingkat}-{kelas.nomor_kelas} {kelas.kelompok}</p>
          <p className="text-xs text-gray-500">{guruList.length > 0 ? `${guruList.length} guru` : 'Klik untuk kelola'}</p>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500 transition">
          <Trash2 className="w-4 h-4" />
        </button>
        {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {/* Expanded: Guru List */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 p-4 space-y-4 animate-in slide-in-from-top-1 duration-200">
          {loading ? (
            <div className="text-center py-4"><Loader2 className="w-5 h-5 animate-spin mx-auto text-gray-400" /></div>
          ) : (
            <>
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 space-y-1">
                  <p className="font-medium text-blue-700 dark:text-blue-300">Saran dari Penugasan Mengajar:</p>
                  {suggestions.map(s => (
                    <p key={s.guru_id}>
                      {s.guru_nama} ({s.total_jam} jam/minggu)
                      {!assignedGuruIds.has(s.guru_id) && (
                        <button
                          onClick={() => { setAddGuruId(s.guru_id); setAddJam(Math.min(Math.max(Math.round(s.total_jam / 6), 1), 4)) }}
                          className="ml-2 text-blue-600 dark:text-blue-400 underline"
                        >
                          + Assign
                        </button>
                      )}
                      {assignedGuruIds.has(s.guru_id) && <span className="ml-2 text-emerald-600">✓</span>}
                    </p>
                  ))}
                </div>
              )}

              {/* Guru list */}
              {guruList.map(g => (
                <div key={g.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800">
                  <Users className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="flex-1 text-sm truncate">{g.guru_nama}</span>
                  <Select value={String(g.jam_mengajar)} onValueChange={v => handleEditJam(g.id, Number(v))}>
                    <SelectTrigger className="w-28 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JAM_OPTIONS.map(j => (
                        <SelectItem key={j.value} value={String(j.value)}>{j.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <button onClick={() => handleDeleteGuru(g.id)} className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Add guru */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Label className="text-xs">Tambah Guru</Label>
                  <Select value={addGuruId} onValueChange={setAddGuruId}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Pilih guru..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableGuru.map(g => (
                        <SelectItem key={g.id} value={g.id}>{g.nama_lengkap}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="w-32">
                  <Label className="text-xs">Jam</Label>
                  <Select value={String(addJam)} onValueChange={v => setAddJam(Number(v))}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {JAM_OPTIONS.map(j => (
                        <SelectItem key={j.value} value={String(j.value)}>{j.value} jam</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" onClick={handleAddGuru} disabled={!addGuruId || saving} className="h-9">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 2: MATERI TES
// ══════════════════════════════════════════════════════════════
function TabMateri({ kelasList }: { kelasList: KelasUnggulan[] }) {
  const [materiList, setMateriList] = useState<MateriItem[]>([])
  const [filterKelas, setFilterKelas] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [editItem, setEditItem] = useState<MateriItem | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const loadMateri = useCallback(async () => {
    setLoading(true)
    const data = await getMateriAdmin(filterKelas && filterKelas !== 'all' ? filterKelas : undefined)
    setMateriList(data)
    setLoading(false)
  }, [filterKelas])

  useEffect(() => { loadMateri() }, [loadMateri])

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus materi ini?')) return
    const res = await hapusMateri(id)
    if (res.success) loadMateri()
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filterKelas} onValueChange={setFilterKelas}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Semua Kelas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Semua Kelas</SelectItem>
            {kelasList.map(k => (
              <SelectItem key={k.id} value={k.id}>{k.tingkat}-{k.nomor_kelas} {k.kelompok}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => { setEditItem(null); setShowAdd(true) }}>
          <Plus className="w-4 h-4 mr-1" />Tambah Materi
        </Button>
      </div>

      <MsgBanner msg={msg} />

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : materiList.length === 0 ? (
        <EmptyState text="Belum ada materi" />
      ) : (
        <div className="space-y-3">
          {materiList.map(m => (
            <div key={m.id} className={`rounded-xl border ${m.is_active ? 'border-gray-200 dark:border-gray-700' : 'border-dashed border-gray-300 dark:border-gray-600 opacity-60'} bg-white dark:bg-gray-800/50 overflow-hidden`}>
              <div className="flex items-center gap-3 p-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{m.judul}</p>
                  <p className="text-xs text-gray-500">{m.kelas_label} • Urutan: {m.urutan} {!m.is_active && '• Nonaktif'}</p>
                </div>
                <button onClick={() => { setEditItem(m); setShowAdd(true) }} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(m.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-gray-400 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {/* Preview konten */}
              <div
                className="border-t border-gray-100 dark:border-gray-700 px-4 py-3 prose prose-sm dark:prose-invert max-w-none max-h-40 overflow-hidden relative prose-img:max-h-32 prose-img:rounded"
                dangerouslySetInnerHTML={{ __html: m.konten || '<p class="text-gray-400 italic">Belum ada konten</p>' }}
              />
            </div>
          ))}
        </div>
      )}

      {/* Modal Editor */}
      {showAdd && (
        <MateriEditorModal
          item={editItem}
          kelasList={kelasList}
          onClose={() => { setShowAdd(false); setEditItem(null) }}
          onSaved={(msg) => { setMsg({ type: 'ok', text: msg }); loadMateri(); setShowAdd(false); setEditItem(null) }}
        />
      )}
    </div>
  )
}

// ── Rich Text Editor Modal ───────────────────────────────────
function MateriEditorModal({ item, kelasList, onClose, onSaved }: {
  item: MateriItem | null
  kelasList: KelasUnggulan[]
  onClose: () => void
  onSaved: (msg: string) => void
}) {
  const [judul, setJudul] = useState(item?.judul || '')
  const [puKelasId, setPuKelasId] = useState(item?.pu_kelas_id || '')
  const [urutan, setUrutan] = useState(item?.urutan ?? 0)
  const [isActive, setIsActive] = useState(item?.is_active !== 0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const editorRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (editorRef.current && item?.konten) {
      editorRef.current.innerHTML = item.konten
    }
  }, [item])

  const execCmd = (cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await uploadMateriMedia(fd)
    if ('error' in res && res.error) { setError(res.error); setUploading(false); return }
    if ('url' in res && res.url) {
      if (res.type === 'image') {
        execCmd('insertHTML', `<img src="${res.url}" alt="Materi" style="max-width:100%;border-radius:8px;margin:8px 0" />`)
      } else {
        execCmd('insertHTML', `<audio controls src="${res.url}" style="width:100%;margin:8px 0"></audio>`)
      }
    }
    setUploading(false)
    if (fileRef.current) fileRef.current.value = ''
  }

  const insertTable = () => {
    const rows = prompt('Jumlah baris:', '3')
    const cols = prompt('Jumlah kolom:', '3')
    if (!rows || !cols) return
    const r = parseInt(rows), c = parseInt(cols)
    let html = '<table style="border-collapse:collapse;width:100%;margin:8px 0"><thead><tr>'
    for (let j = 0; j < c; j++) html += '<th style="border:1px solid #ccc;padding:6px 8px;background:#f5f5f5">Header</th>'
    html += '</tr></thead><tbody>'
    for (let i = 0; i < r - 1; i++) {
      html += '<tr>'
      for (let j = 0; j < c; j++) html += '<td style="border:1px solid #ccc;padding:6px 8px">-</td>'
      html += '</tr>'
    }
    html += '</tbody></table>'
    execCmd('insertHTML', html)
  }

  const handleSave = async () => {
    if (!judul.trim()) { setError('Judul wajib diisi'); return }
    if (!puKelasId) { setError('Kelas wajib dipilih'); return }
    const konten = editorRef.current?.innerHTML || ''
    setSaving(true); setError(null)
    let res
    if (item) {
      res = await editMateri(item.id, judul.trim(), konten, urutan, isActive)
    } else {
      res = await tambahMateri(puKelasId, judul.trim(), konten, urutan)
    }
    if ('error' in res && res.error) { setError(res.error); setSaving(false); return }
    onSaved(item ? 'Materi berhasil diperbarui' : 'Materi berhasil ditambahkan')
    setSaving(false)
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{item ? 'Edit Materi' : 'Tambah Materi'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Judul Materi</Label>
              <Input value={judul} onChange={e => setJudul(e.target.value)} placeholder="Contoh: Surah Al-Baqarah Ayat 1-5" />
            </div>
            <div>
              <Label>Kelas Unggulan</Label>
              <Select value={puKelasId} onValueChange={setPuKelasId}>
                <SelectTrigger><SelectValue placeholder="Pilih kelas..." /></SelectTrigger>
                <SelectContent>
                  {kelasList.map(k => (
                    <SelectItem key={k.id} value={k.id}>{k.tingkat}-{k.nomor_kelas} {k.kelompok}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Urutan</Label>
              <Input type="number" value={urutan} onChange={e => setUrutan(Number(e.target.value))} min={0} />
            </div>
            <div className="flex items-end gap-2 pb-1">
              <Checkbox id="is_active" checked={isActive} onCheckedChange={(v) => setIsActive(!!v)} />
              <Label htmlFor="is_active" className="text-sm cursor-pointer">Aktif</Label>
            </div>
          </div>

          {/* Toolbar */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
            <div className="flex flex-wrap items-center gap-0.5 p-1.5 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
              <ToolBtn icon={Bold} onClick={() => execCmd('bold')} title="Tebal" />
              <ToolBtn icon={Italic} onClick={() => execCmd('italic')} title="Miring" />
              <ToolBtn icon={Underline} onClick={() => execCmd('underline')} title="Garis bawah" />
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />
              <ToolBtn icon={Heading2} onClick={() => execCmd('formatBlock', 'h3')} title="Heading" />
              <ToolBtn icon={List} onClick={() => execCmd('insertUnorderedList')} title="Bullet list" />
              <ToolBtn icon={ListOrdered} onClick={() => execCmd('insertOrderedList')} title="Numbered list" />
              <div className="w-px h-5 bg-gray-300 dark:bg-gray-600 mx-0.5" />
              <ToolBtn icon={TableIcon} onClick={insertTable} title="Tabel" />
              <ToolBtn icon={ImageIcon} onClick={() => fileRef.current?.click()} title="Gambar/Audio" />
              {uploading && <Loader2 className="w-4 h-4 animate-spin text-blue-500 ml-1" />}
            </div>
            <input ref={fileRef} type="file" accept="image/*,audio/*" className="hidden" onChange={handleUpload} />
            <div
              ref={editorRef}
              contentEditable
              className="min-h-[200px] max-h-[400px] overflow-y-auto p-4 outline-none prose prose-sm dark:prose-invert max-w-none focus:ring-2 focus:ring-emerald-500/20 prose-img:max-h-60 prose-img:rounded-lg prose-table:text-sm prose-td:border prose-td:px-2 prose-td:py-1 prose-th:border prose-th:px-2 prose-th:py-1 prose-th:bg-gray-50 dark:prose-th:bg-gray-800"
              data-placeholder="Tulis materi tes di sini... (bisa tambahkan gambar, audio, dan tabel)"
              suppressContentEditableWarning
            />
          </div>

          {error && <p className="text-sm text-red-500 flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{error}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Batal</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Save className="w-4 h-4 mr-1" />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ToolBtn({ icon: Icon, onClick, title }: { icon: any; onClick: () => void; title: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition"
    >
      <Icon className="w-4 h-4" />
    </button>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 3: MONITORING
// ══════════════════════════════════════════════════════════════
function TabMonitoring({ kelasList }: { kelasList: KelasUnggulan[] }) {
  const [filterKelas, setFilterKelas] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [data, setData] = useState<{ guruActivity: any[]; siswaRekap: any[] }>({ guruActivity: [], siswaRekap: [] })
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState<'guru' | 'siswa'>('guru')

  const loadData = useCallback(async () => {
    setLoading(true)
    const kelas = filterKelas && filterKelas !== 'all' ? filterKelas : undefined
    const res = await getMonitoringData(kelas, dateFrom || undefined, dateTo || undefined)
    setData(res)
    setLoading(false)
  }, [filterKelas, dateFrom, dateTo])

  useEffect(() => { loadData() }, [loadData])

  // Group guru activity by guru + tanggal
  const guruGrouped = new Map<string, { nama: string; tanggal: string; records: any[] }>()
  for (const r of data.guruActivity) {
    const key = `${r.guru_id}-${r.tanggal}`
    if (!guruGrouped.has(key)) guruGrouped.set(key, { nama: r.guru_nama, tanggal: r.tanggal, records: [] })
    guruGrouped.get(key)!.records.push(r)
  }
  const guruEntries = Array.from(guruGrouped.values()).sort((a, b) => b.tanggal.localeCompare(a.tanggal) || a.nama.localeCompare(b.nama))

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-xs">Kelas</Label>
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Kelas</SelectItem>
              {kelasList.map(k => (
                <SelectItem key={k.id} value={k.id}>{k.tingkat}-{k.nomor_kelas} {k.kelompok}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dari</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Sampai</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
      </div>

      {/* Toggle view */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg w-fit">
        <button
          onClick={() => setView('guru')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'guru' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
        >
          Aktivitas Guru
        </button>
        <button
          onClick={() => setView('siswa')}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${view === 'siswa' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}
        >
          Rekap Siswa
        </button>
      </div>

      {loading ? (
        <div className="text-center py-8"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : view === 'guru' ? (
        /* Guru Activity */
        guruEntries.length === 0 ? <EmptyState text="Belum ada data pengetesan" /> : (
          <div className="space-y-3">
            {guruEntries.map((entry, i) => (
              <div key={i} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="font-medium text-sm">{entry.nama}</span>
                  <span className="text-xs text-gray-500 ml-auto">{formatTanggal(entry.tanggal)}</span>
                </div>
                <div className="space-y-1">
                  {entry.records.map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs py-1 px-2 rounded bg-gray-50 dark:bg-gray-800">
                      <span className="flex-1 truncate">{r.siswa_nama}</span>
                      <span className="text-gray-400">{r.kelas_label}</span>
                      <StatusBadge status={r.status} nilai={r.nilai} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Siswa Rekap */
        data.siswaRekap.length === 0 ? <EmptyState text="Belum ada data siswa" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 text-left">
                  <th className="py-2 px-2 font-medium">Siswa</th>
                  <th className="py-2 px-2 font-medium">Kelas</th>
                  <th className="py-2 px-2 font-medium text-center">Tes</th>
                  <th className="py-2 px-2 font-medium text-center text-emerald-600">L</th>
                  <th className="py-2 px-2 font-medium text-center text-amber-600">KL</th>
                  <th className="py-2 px-2 font-medium text-center text-red-600">TL</th>
                  <th className="py-2 px-2 font-medium text-center">Absen</th>
                </tr>
              </thead>
              <tbody>
                {data.siswaRekap.map((r: any, i: number) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50">
                    <td className="py-2 px-2 truncate max-w-[120px]">{r.siswa_nama}</td>
                    <td className="py-2 px-2 text-gray-500">{r.kelas_label}</td>
                    <td className="py-2 px-2 text-center font-medium">{r.total_tes || 0}</td>
                    <td className="py-2 px-2 text-center text-emerald-600">{r.lancar || 0}</td>
                    <td className="py-2 px-2 text-center text-amber-600">{r.kurang_lancar || 0}</td>
                    <td className="py-2 px-2 text-center text-red-600">{r.tidak_lancar || 0}</td>
                    <td className="py-2 px-2 text-center text-gray-400">{r.absen || 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// TAB 4: CETAK LAPORAN
// ══════════════════════════════════════════════════════════════
function TabLaporan({ kelasList }: { kelasList: KelasUnggulan[] }) {
  const [filterKelas, setFilterKelas] = useState<string>('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [reportType, setReportType] = useState<'guru' | 'siswa'>('guru')
  const printRef = useRef<HTMLDivElement>(null)

  const loadReport = async () => {
    setLoading(true)
    const kelas = filterKelas && filterKelas !== 'all' ? filterKelas : undefined
    const data = await getLaporanData(kelas, dateFrom || undefined, dateTo || undefined)
    setReportData(data)
    setLoading(false)
  }

  const handlePrint = () => {
    if (!printRef.current) return
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Laporan Program Unggulan</title>
      <style>
        body { font-family: 'Segoe UI', system-ui, sans-serif; font-size: 11px; padding: 20px; color: #222; }
        h1 { font-size: 16px; text-align: center; margin-bottom: 4px; }
        h2 { font-size: 13px; color: #555; text-align: center; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #ccc; padding: 5px 8px; text-align: left; }
        th { background: #f0f0f0; font-weight: 600; }
        .text-center { text-align: center; }
        .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; }
        .badge-ok { background: #d1fae5; color: #065f46; }
        .badge-warn { background: #fef3c7; color: #92400e; }
        .badge-err { background: #fee2e2; color: #991b1b; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${printRef.current.innerHTML}
      </body></html>
    `)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
  }

  const handleExportExcel = () => {
    if (!printRef.current) return
    const table = printRef.current.querySelector('table')
    if (!table) return
    let csv = ''
    const rows = table.querySelectorAll('tr')
    rows.forEach(row => {
      const cells = row.querySelectorAll('th, td')
      const line = Array.from(cells).map(c => `"${(c as HTMLElement).innerText.replace(/"/g, '""')}"`)
      csv += line.join(',') + '\n'
    })
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `laporan-program-unggulan-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div>
          <Label className="text-xs">Kelas</Label>
          <Select value={filterKelas} onValueChange={setFilterKelas}>
            <SelectTrigger className="w-44 h-9 text-sm">
              <SelectValue placeholder="Semua" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua</SelectItem>
              {kelasList.map(k => (
                <SelectItem key={k.id} value={k.id}>{k.tingkat}-{k.nomor_kelas} {k.kelompok}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Dari</Label>
          <Input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <div>
          <Label className="text-xs">Sampai</Label>
          <Input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="h-9 w-36 text-sm" />
        </div>
        <Button size="sm" onClick={loadReport} disabled={loading} className="h-9">
          {loading ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <Search className="w-4 h-4 mr-1" />}
          Muat Data
        </Button>
      </div>

      {reportData && (
        <>
          <div className="flex items-center gap-2">
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg">
              <button onClick={() => setReportType('guru')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${reportType === 'guru' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                Laporan Guru
              </button>
              <button onClick={() => setReportType('siswa')} className={`px-3 py-1.5 rounded-md text-xs font-medium transition ${reportType === 'siswa' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500'}`}>
                Laporan Siswa
              </button>
            </div>
            <div className="ml-auto flex gap-2">
              <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="w-4 h-4 mr-1" />Cetak PDF</Button>
              <Button size="sm" variant="outline" onClick={handleExportExcel}><Download className="w-4 h-4 mr-1" />Excel/CSV</Button>
            </div>
          </div>

          {/* Preview */}
          <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-4 overflow-x-auto">
            <div ref={printRef}>
              <h1 style={{ fontSize: '16px', textAlign: 'center', marginBottom: '4px' }}>LAPORAN PROGRAM UNGGULAN</h1>
              <h2 style={{ fontSize: '12px', textAlign: 'center', color: '#666', marginBottom: '16px' }}>
                {reportData.tahunAjaran}
                {dateFrom && ` • Dari: ${formatTanggal(dateFrom)}`}
                {dateTo && ` s.d. ${formatTanggal(dateTo)}`}
              </h2>

              {reportType === 'guru' ? (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>No</th>
                      <th style={thStyle}>Nama Guru</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Sesi Tes</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Siswa Dites</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.guruSummary.map((g: any, i: number) => (
                      <tr key={g.guru_id}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{g.guru_nama}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{g.total_sesi}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{g.total_siswa_dites}</td>
                      </tr>
                    ))}
                    {reportData.guruSummary.length === 0 && (
                      <tr><td colSpan={4} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Belum ada data</td></tr>
                    )}
                  </tbody>
                </table>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                  <thead>
                    <tr>
                      <th style={thStyle}>No</th>
                      <th style={thStyle}>Nama Siswa</th>
                      <th style={thStyle}>Kelas</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Total Tes</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Lancar</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Kurang Lancar</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Tidak Lancar</th>
                      <th style={{ ...thStyle, textAlign: 'center' }}>Absen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.siswaRekap.map((r: any, i: number) => (
                      <tr key={i}>
                        <td style={tdStyle}>{i + 1}</td>
                        <td style={tdStyle}>{r.siswa_nama}</td>
                        <td style={tdStyle}>{r.kelas_label}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{r.total_tes || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{r.lancar || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{r.kurang_lancar || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{r.tidak_lancar || 0}</td>
                        <td style={{ ...tdStyle, textAlign: 'center' }}>{r.absen || 0}</td>
                      </tr>
                    ))}
                    {reportData.siswaRekap.length === 0 && (
                      <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: '#999' }}>Belum ada data</td></tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}

      {!reportData && !loading && (
        <EmptyState text="Pilih filter lalu klik 'Muat Data' untuk melihat laporan" />
      )}
    </div>
  )
}

// ══════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════
function MsgBanner({ msg }: { msg: { type: 'ok' | 'err'; text: string } | null }) {
  if (!msg) return null
  return (
    <p className={`text-xs flex items-center gap-1 ${msg.type === 'ok' ? 'text-emerald-600' : 'text-red-500'}`}>
      {msg.type === 'ok' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
      {msg.text}
    </p>
  )
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="text-center py-10 text-gray-400 dark:text-gray-500 text-sm">
      <Star className="w-8 h-8 mx-auto mb-2 opacity-30" />
      <p>{text}</p>
    </div>
  )
}

function StatusBadge({ status, nilai }: { status: string; nilai: string | null }) {
  if (status === 'sudah' && nilai) {
    const color = nilai === 'Lancar' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
      : nilai === 'Kurang Lancar' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
      : 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
    return <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${color}`}>{nilai}</span>
  }
  if (['sakit', 'izin', 'alfa'].includes(status)) {
    return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400 capitalize">{status}</span>
  }
  return <span className="px-1.5 py-0.5 rounded text-[10px] text-gray-400">Belum</span>
}

function formatTanggal(dateStr: string) {
  try {
    const d = new Date(dateStr + 'T00:00:00')
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  } catch { return dateStr }
}

const thStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '5px 8px', background: '#f0f0f0', fontWeight: 600, fontSize: '11px' }
const tdStyle: React.CSSProperties = { border: '1px solid #ccc', padding: '5px 8px', fontSize: '11px' }
