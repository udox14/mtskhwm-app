// Lokasi: app/dashboard/surat/components/surat-client.tsx
'use client'

import { useState, useRef, useCallback } from 'react'
import { useReactToPrint } from 'react-to-print'
import {
  FileText, Printer, Loader2, X, ChevronRight, ChevronLeft, Eye, Trash2, Search,
  UserCheck, Briefcase, BookOpen, ClipboardCheck, Mail, Users, Megaphone,
  ArrowRightLeft, FileSignature, ShieldCheck, Plus, Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import * as TabsPrimitive from '@radix-ui/react-tabs'
import {
  TEMPLATE_MAP, formatTanggalIndo,
} from './surat-templates'
import {
  simpanSuratKeluar, hapusSuratKeluar, getSuratKeluar,
  type JenisSurat, JENIS_SURAT_LABEL,
} from '../actions'

// ============================================================
// TYPES
// ============================================================
type MasterData = {
  siswa: any[]
  guru: any[]
  kelas: any[]
  pejabat: any[]
}

type SuratConfig = {
  id: JenisSurat
  label: string
  icon: any
  needsSiswa: boolean
  needsGuru: boolean
  multiGuru: boolean
  defaultPenandatangan: string
}

// ============================================================
// SURAT TYPE CONFIGS
// ============================================================
const SURAT_CONFIGS: SuratConfig[] = [
  { id: 'penerimaan', label: 'Surat Penerimaan', icon: UserCheck, needsSiswa: true, needsGuru: false, multiGuru: false, defaultPenandatangan: 'Dudi Ahmad Syaehu, M.M.Pd.' },
  { id: 'sppd', label: 'SPPD', icon: Briefcase, needsSiswa: false, needsGuru: true, multiGuru: false, defaultPenandatangan: 'Dudi Ahmad Syaehu, M.M.Pd.' },
  { id: 'izin_pesantren', label: 'Izin ke Pesantren', icon: BookOpen, needsSiswa: false, needsGuru: false, multiGuru: false, defaultPenandatangan: 'H. E. Anwar Sanusi, S.Ag' },
  { id: 'ket_aktif', label: 'Ket. Aktif', icon: ClipboardCheck, needsSiswa: true, needsGuru: false, multiGuru: false, defaultPenandatangan: 'H. E. Anwar Sanusi, S.Ag' },
  { id: 'permohonan', label: 'Surat Permohonan', icon: Mail, needsSiswa: false, needsGuru: false, multiGuru: false, defaultPenandatangan: 'H. E. Anwar Sanusi, S.Ag' },
  { id: 'surat_tugas', label: 'Surat Tugas', icon: Users, needsSiswa: false, needsGuru: true, multiGuru: true, defaultPenandatangan: 'Dudi Ahmad Syaehu, M.M.Pd.' },
  { id: 'undangan_rapat', label: 'Undangan Rapat', icon: Megaphone, needsSiswa: false, needsGuru: false, multiGuru: false, defaultPenandatangan: 'H. E. Anwar Sanusi, S.Ag' },
  { id: 'pindah', label: 'Surat Pindah', icon: ArrowRightLeft, needsSiswa: true, needsGuru: false, multiGuru: false, defaultPenandatangan: 'H. E. Anwar Sanusi, S.Ag' },
  { id: 'pernyataan', label: 'Surat Pernyataan', icon: FileSignature, needsSiswa: true, needsGuru: false, multiGuru: false, defaultPenandatangan: '' },
  { id: 'kelakuan_baik', label: 'Kelakuan Baik', icon: ShieldCheck, needsSiswa: true, needsGuru: false, multiGuru: false, defaultPenandatangan: 'H. E. Anwar Sanusi, S.Ag' },
]

// ============================================================
// MAIN COMPONENT
// ============================================================
export function SuratClient({ masterData, logSurat: initialLog, currentUser }: {
  masterData: MasterData
  logSurat: any[]
  currentUser: { id: string; nama: string }
}) {
  const [activeTab, setActiveTab] = useState('buat')
  const [logData, setLogData] = useState(initialLog)
  const [filterJenis, setFilterJenis] = useState('')
  const [filterTahun, setFilterTahun] = useState(String(new Date().getFullYear()))
  const [filterBulan, setFilterBulan] = useState('')
  const [isFilterLoading, setIsFilterLoading] = useState(false)

  // Wizard state
  const [wizardOpen, setWizardOpen] = useState(false)
  const [wizardType, setWizardType] = useState<JenisSurat | null>(null)
  const [wizardStep, setWizardStep] = useState<'form' | 'preview'>('form')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ success?: string; error?: string; nomor_surat?: string } | null>(null)

  // Print ref
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({ contentRef: printRef })

  // ----------------------------------------------------------
  // WIZARD HELPERS
  // ----------------------------------------------------------
  const openWizard = (type: JenisSurat) => {
    const config = SURAT_CONFIGS.find(c => c.id === type)!
    setWizardType(type)
    setWizardStep('form')
    setFormData({ penandatangan: config.defaultPenandatangan })
    setSaveResult(null)
    setWizardOpen(true)
  }

  const closeWizard = () => {
    setWizardOpen(false)
    setWizardType(null)
    setFormData({})
    setSaveResult(null)
  }

  const updateField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const selectedSiswa = formData.siswa_id
    ? masterData.siswa.find((s: any) => s.id === formData.siswa_id)
    : null

  const buildTemplateData = () => {
    const base: Record<string, any> = { ...formData, nomor_surat: saveResult?.nomor_surat || '___/Mts.10.06.696/PP.00.5/___/____' }
    if (selectedSiswa) {
      base.siswa = selectedSiswa
    }
    if (wizardType === 'sppd' && formData.guru_id) {
      const g = masterData.guru.find((g: any) => g.id === formData.guru_id)
      if (g) {
        base.nama_pegawai = g.nama_lengkap
        base.jabatan_pegawai = g.jabatan_struktural || g.role || '-'
      }
    }
    if (wizardType === 'surat_tugas') {
      const ids = formData.guru_ids || []
      base.daftar_guru = ids.map((id: string) => {
        const g = masterData.guru.find((g: any) => g.id === id)
        return g ? { nama: g.nama_lengkap, jabatan: g.jabatan_struktural || g.role || '-' } : null
      }).filter(Boolean)
    }
    return base
  }

  const handleSaveAndPreview = async () => {
    if (!wizardType) return
    setIsSaving(true)
    const result = await simpanSuratKeluar({
      jenis_surat: wizardType,
      perihal: formData.perihal || JENIS_SURAT_LABEL[wizardType],
      data_surat: buildTemplateData(),
      dicetak_oleh: currentUser.id,
      nama_pencetak: currentUser.nama,
    })
    setSaveResult(result)
    setIsSaving(false)
    if (result.success) {
      setWizardStep('preview')
      refreshLog()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Yakin hapus surat ini dari log?')) return
    const result = await hapusSuratKeluar(id)
    if (result.success) refreshLog()
  }

  const refreshLog = async () => {
    setIsFilterLoading(true)
    const data = await getSuratKeluar({
      jenis_surat: filterJenis as any || undefined,
      tahun: filterTahun ? parseInt(filterTahun) : undefined,
      bulan: filterBulan ? parseInt(filterBulan) : undefined,
    })
    setLogData(data)
    setIsFilterLoading(false)
  }

  // ----------------------------------------------------------
  // RENDER: WIZARD FORM FIELDS
  // ----------------------------------------------------------
  const renderFormFields = () => {
    if (!wizardType) return null
    const config = SURAT_CONFIGS.find(c => c.id === wizardType)!

    return (
      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {/* Siswa selector */}
        {config.needsSiswa && (
          <div>
            <Label className="text-xs font-medium">Pilih Siswa</Label>
            <select
              className="w-full mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={formData.siswa_id || ''}
              onChange={e => updateField('siswa_id', e.target.value)}
            >
              <option value="">-- Pilih Siswa --</option>
              {masterData.siswa.map((s: any) => (
                <option key={s.id} value={s.id}>
                  {s.nama_lengkap} — {s.tingkat ? `Kelas ${s.tingkat}.${s.nomor_kelas}` : 'Belum ada kelas'}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Guru selector (single) */}
        {config.needsGuru && !config.multiGuru && (
          <div>
            <Label className="text-xs font-medium">Pilih Pegawai</Label>
            <select
              className="w-full mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={formData.guru_id || ''}
              onChange={e => updateField('guru_id', e.target.value)}
            >
              <option value="">-- Pilih Pegawai --</option>
              {masterData.guru.map((g: any) => (
                <option key={g.id} value={g.id}>
                  {g.nama_lengkap}{g.jabatan_struktural ? ` — ${g.jabatan_struktural}` : ''}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Guru selector (multi for surat tugas) */}
        {config.multiGuru && (
          <div>
            <Label className="text-xs font-medium">Pilih Pegawai (bisa lebih dari satu)</Label>
            <div className="mt-1 max-h-40 overflow-y-auto border rounded-md border-slate-200 dark:border-slate-700 p-2 space-y-1">
              {masterData.guru.map((g: any) => {
                const ids = formData.guru_ids || []
                const checked = ids.includes(g.id)
                return (
                  <label key={g.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded px-1 py-0.5">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {
                        const next = checked ? ids.filter((id: string) => id !== g.id) : [...ids, g.id]
                        updateField('guru_ids', next)
                      }}
                      className="rounded"
                    />
                    <span>{g.nama_lengkap}{g.jabatan_struktural ? ` — ${g.jabatan_struktural}` : ''}</span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* Type-specific fields */}
        {wizardType === 'penerimaan' && (
          <Field label="Tanggal Diterima" type="date" field="tanggal_terima" formData={formData} onChange={updateField} />
        )}

        {wizardType === 'sppd' && (<>
          <Field label="Maksud Perjalanan Dinas" field="maksud_perjalanan" formData={formData} onChange={updateField} />
          <Field label="Tempat Tujuan" field="tempat_tujuan" formData={formData} onChange={updateField} />
          <Field label="Tanggal Berangkat" type="date" field="tanggal_berangkat" formData={formData} onChange={updateField} />
          <Field label="Tanggal Kembali (opsional)" type="date" field="tanggal_kembali" formData={formData} onChange={updateField} />
          <Field label="Lama Perjalanan" field="lama_perjalanan" formData={formData} onChange={updateField} placeholder="1 hari" />
          <Field label="Alat Angkut" field="alat_angkut" formData={formData} onChange={updateField} placeholder="Darat" />
        </>)}

        {wizardType === 'izin_pesantren' && (<>
          <Field label="Tujuan Surat (Kepada)" field="tujuan_surat" formData={formData} onChange={updateField} placeholder="Wakil Pimpinan Bid. Kesantrian Pondok Pesantren ..." />
          <Field label="Keperluan / Alasan" field="keperluan" formData={formData} onChange={updateField} placeholder="akan dilaksanakannya In House Training" />
          <Field label="Hari, Tanggal" field="hari_tanggal" formData={formData} onChange={updateField} placeholder="Rabu, 30 Juli 2025" />
          <Field label="Waktu" field="waktu" formData={formData} onChange={updateField} placeholder="08.00 s.d Selesai" />
          <Field label="Tempat" field="tempat" formData={formData} onChange={updateField} placeholder="MTs KH. A. Wahab Muhsin Sukahideng" />
        </>)}

        {wizardType === 'ket_aktif' && (
          <Field label="Tahun Pelajaran Masuk" field="tahun_masuk" formData={formData} onChange={updateField} placeholder="2023/2024" />
        )}

        {wizardType === 'permohonan' && (<>
          <Field label="Tujuan Surat (Kepada)" field="tujuan_surat" formData={formData} onChange={updateField} placeholder="Pendamping Madrasah (Drs. ...)" />
          <Field label="Perihal" field="perihal" formData={formData} onChange={updateField} placeholder="Permohonan" />
          <Field label="Lampiran" field="lampiran" formData={formData} onChange={updateField} placeholder="-" />
          <Field label="Isi Surat" field="isi_surat" formData={formData} onChange={updateField} textarea placeholder="Sehubungan akan diadakannya ..." />
          <Field label="Hari/Tanggal Kegiatan (opsional)" field="hari_tanggal" formData={formData} onChange={updateField} />
          <Field label="Waktu (opsional)" field="waktu" formData={formData} onChange={updateField} />
          <Field label="Tempat (opsional)" field="tempat" formData={formData} onChange={updateField} />
          <Field label="Isi Tambahan (opsional)" field="isi_tambahan" formData={formData} onChange={updateField} textarea />
        </>)}

        {wizardType === 'surat_tugas' && (<>
          <Field label="Dasar Surat (opsional)" field="dasar_surat" formData={formData} onChange={updateField} textarea placeholder="Mengingat surat dari ... tentang ..." />
          <Field label="Tujuan Penugasan" field="tujuan_tugas" formData={formData} onChange={updateField} placeholder="membimbing peserta lomba" />
          <Field label="Tanggal Kegiatan" field="tanggal_kegiatan" formData={formData} onChange={updateField} placeholder="11 November 2025" />
          <Field label="Tempat Kegiatan" field="tempat_kegiatan" formData={formData} onChange={updateField} placeholder="MAN 1 Ciamis" />
        </>)}

        {wizardType === 'undangan_rapat' && (<>
          <Field label="Tujuan Undangan (Kepada)" field="tujuan_surat" formData={formData} onChange={updateField} placeholder="Pendidik dan Tenaga Kependidikan" />
          <Field label="Perihal" field="perihal" formData={formData} onChange={updateField} placeholder="Undangan Rapat" />
          <Field label="Keterangan Pembuka" field="isi_surat" formData={formData} onChange={updateField} textarea placeholder="Sehubungan akan dilaksanakannya ..." />
          <Field label="Hari/Tanggal" field="hari_tanggal" formData={formData} onChange={updateField} placeholder="Selasa, 10 Februari 2026" />
          <Field label="Waktu" field="waktu" formData={formData} onChange={updateField} placeholder="Pukul 07:30 WIB s.d Selesai" />
          <Field label="Tempat" field="tempat" formData={formData} onChange={updateField} placeholder="Aula Terbuka MTs KH. A. Wahab Muhsin" />
          <Field label="Agenda" field="agenda" formData={formData} onChange={updateField} placeholder="Pembinaan Tenaga Pendidik" />
          <Field label="Catatan (opsional)" field="catatan" formData={formData} onChange={updateField} />
        </>)}

        {wizardType === 'pindah' && (<>
          <Field label="Alasan Pindah" field="alasan_pindah" formData={formData} onChange={updateField} />
          <Field label="Sekolah Tujuan" field="sekolah_tujuan" formData={formData} onChange={updateField} />
        </>)}

        {wizardType === 'pernyataan' && (<>
          <Field label="Nama Orang Tua/Wali" field="nama_ortu" formData={formData} onChange={updateField}
            placeholder={selectedSiswa?.nama_ayah || ''} />
          <Field label="Alamat Orang Tua/Wali" field="alamat_ortu" formData={formData} onChange={updateField} />
          <Field label="No. KTP" field="no_ktp" formData={formData} onChange={updateField}
            placeholder={selectedSiswa?.nik_ayah || ''} />
          <Field label="Tahun Pelajaran" field="tahun_pelajaran" formData={formData} onChange={updateField} placeholder="2025/2026" />
        </>)}

        {/* Tanggal surat (universal) */}
        <Field label="Tanggal Surat" type="date" field="tanggal_surat_raw" formData={formData}
          onChange={(k, v) => {
            updateField(k, v)
            updateField('tanggal_surat', formatTanggalIndo(v))
          }}
        />

        {/* Penandatangan (kecuali surat pernyataan) */}
        {wizardType !== 'pernyataan' && (
          <div>
            <Label className="text-xs font-medium">Penandatangan</Label>
            <select
              className="w-full mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm"
              value={formData.penandatangan || ''}
              onChange={e => updateField('penandatangan', e.target.value)}
            >
              <option value="">-- Pilih atau ketik manual --</option>
              {masterData.pejabat.filter((p: any) => p.nama_lengkap).map((p: any) => (
                <option key={p.user_id} value={p.nama_lengkap}>
                  {p.nama_lengkap} — {p.nama}
                </option>
              ))}
            </select>
            <Input
              className="mt-1"
              placeholder="Atau ketik nama manual..."
              value={formData.penandatangan || ''}
              onChange={e => updateField('penandatangan', e.target.value)}
            />
          </div>
        )}
      </div>
    )
  }

  // ----------------------------------------------------------
  // RENDER: MAIN
  // ----------------------------------------------------------
  const BULAN_NAMES = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

  return (
    <>
      <TabsPrimitive.Root value={activeTab} onValueChange={setActiveTab}>
        <TabsPrimitive.List className="flex gap-1 bg-slate-100 dark:bg-slate-800 rounded-lg p-1 w-fit">
          <TabsPrimitive.Trigger value="buat" className="px-4 py-1.5 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">
            <Plus className="h-3.5 w-3.5 inline mr-1.5" />Buat Surat
          </TabsPrimitive.Trigger>
          <TabsPrimitive.Trigger value="log" className="px-4 py-1.5 text-sm font-medium rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-slate-700 data-[state=active]:shadow-sm transition-all">
            <FileText className="h-3.5 w-3.5 inline mr-1.5" />Log Surat Keluar
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        {/* TAB: BUAT SURAT */}
        <TabsPrimitive.Content value="buat" className="mt-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {SURAT_CONFIGS.map(cfg => {
              const Icon = cfg.icon
              return (
                <button
                  key={cfg.id}
                  onClick={() => openWizard(cfg.id)}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 hover:border-amber-300 dark:hover:border-amber-600 hover:shadow-md transition-all group text-center"
                >
                  <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 group-hover:scale-110 transition-transform">
                    <Icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-medium text-slate-700 dark:text-slate-300 leading-tight">{cfg.label}</span>
                </button>
              )
            })}
          </div>
        </TabsPrimitive.Content>

        {/* TAB: LOG SURAT */}
        <TabsPrimitive.Content value="log" className="mt-4 space-y-3">
          {/* Filters */}
          <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700">
            <div>
              <Label className="text-[10px] text-slate-500">Jenis Surat</Label>
              <select className="block mt-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                value={filterJenis} onChange={e => setFilterJenis(e.target.value)}>
                <option value="">Semua</option>
                {Object.entries(JENIS_SURAT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Bulan</Label>
              <select className="block mt-0.5 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2 py-1.5 text-xs"
                value={filterBulan} onChange={e => setFilterBulan(e.target.value)}>
                <option value="">Semua</option>
                {BULAN_NAMES.slice(1).map((b, i) => (
                  <option key={i + 1} value={String(i + 1)}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-[10px] text-slate-500">Tahun</Label>
              <Input className="h-8 w-20 text-xs" value={filterTahun}
                onChange={e => setFilterTahun(e.target.value)} />
            </div>
            <Button size="sm" variant="outline" onClick={refreshLog} disabled={isFilterLoading}>
              {isFilterLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Filter className="h-3.5 w-3.5" />}
              <span className="ml-1 text-xs">Filter</span>
            </Button>
          </div>

          {/* Table */}
          <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-x-auto bg-white dark:bg-slate-900">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-800 text-left">
                  <th className="px-3 py-2 font-medium text-slate-500">No. Surat</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Jenis</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Perihal</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Dicetak oleh</th>
                  <th className="px-3 py-2 font-medium text-slate-500">Tanggal</th>
                  <th className="px-3 py-2 font-medium text-slate-500 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {logData.length === 0 ? (
                  <tr><td colSpan={6} className="px-3 py-8 text-center text-slate-400">Belum ada surat yang tercatat.</td></tr>
                ) : logData.map((s: any) => (
                  <tr key={s.id} className="border-t border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-3 py-2 font-mono text-[11px]">{s.nomor_surat}</td>
                    <td className="px-3 py-2">
                      <span className="inline-block px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 text-[10px] font-medium">
                        {JENIS_SURAT_LABEL[s.jenis_surat as JenisSurat] || s.jenis_surat}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400 max-w-[200px] truncate">{s.perihal || '-'}</td>
                    <td className="px-3 py-2 text-slate-600 dark:text-slate-400">{s.nama_pencetak || '-'}</td>
                    <td className="px-3 py-2 text-slate-500">
                      {s.created_at ? new Date(s.created_at + 'Z').toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <button onClick={() => handleDelete(s.id)} className="text-red-400 hover:text-red-600 transition-colors" title="Hapus">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>

      {/* ============================================================
          WIZARD MODAL
          ============================================================ */}
      <DialogPrimitive.Root open={wizardOpen} onOpenChange={v => !v && closeWizard()}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 bg-black/50 z-50" />
          <DialogPrimitive.Content className="fixed inset-0 z-50 flex items-start justify-center pt-[3vh] pb-[3vh] overflow-y-auto">
            <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-2xl w-full mx-3 ${wizardStep === 'preview' ? 'max-w-[240mm]' : 'max-w-lg'} transition-all duration-300`}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                    {wizardType ? JENIS_SURAT_LABEL[wizardType] : 'Buat Surat'}
                  </h3>
                  {wizardStep === 'preview' && saveResult?.nomor_surat && (
                    <span className="text-[10px] font-mono text-amber-600 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded">
                      {saveResult.nomor_surat}
                    </span>
                  )}
                </div>
                <DialogPrimitive.Close className="p-1 rounded-md text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                  <X className="h-4 w-4" />
                </DialogPrimitive.Close>
              </div>

              {/* Body */}
              <div className="px-5 py-4">
                {wizardStep === 'form' && (
                  <>
                    {renderFormFields()}
                    <div className="flex justify-end gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={closeWizard}>Batal</Button>
                      <Button size="sm" onClick={handleSaveAndPreview} disabled={isSaving}
                        className="bg-amber-600 hover:bg-amber-700 text-white">
                        {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                        Simpan & Preview
                      </Button>
                    </div>
                    {saveResult?.error && (
                      <p className="text-xs text-red-500 mt-2">{saveResult.error}</p>
                    )}
                  </>
                )}

                {wizardStep === 'preview' && wizardType && (
                  <>
                    {/* Print preview */}
                    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-auto max-h-[70vh] bg-gray-100 dark:bg-slate-800 p-4">
                      <div ref={printRef} style={{ background: '#fff' }}>
                        {(() => {
                          const Tpl = TEMPLATE_MAP[wizardType]
                          if (!Tpl) return <p>Template tidak ditemukan</p>
                          const data = { ...buildTemplateData(), nomor_surat: saveResult?.nomor_surat || '' }
                          return <Tpl data={data} />
                        })()}
                      </div>
                    </div>
                    <div className="flex justify-between gap-2 mt-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <Button variant="outline" size="sm" onClick={() => setWizardStep('form')}>
                        <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Kembali
                      </Button>
                      <Button size="sm" onClick={() => handlePrint()}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Printer className="h-3.5 w-3.5 mr-1" /> Cetak PDF
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </>
  )
}

// ============================================================
// FIELD HELPER COMPONENT
// ============================================================
function Field({ label, field, formData, onChange, type = 'text', placeholder, textarea }: {
  label: string; field: string; formData: any; onChange: (k: string, v: any) => void
  type?: string; placeholder?: string; textarea?: boolean
}) {
  return (
    <div>
      <Label className="text-xs font-medium">{label}</Label>
      {textarea ? (
        <textarea
          className="w-full mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm min-h-[60px]"
          value={formData[field] || ''}
          onChange={e => onChange(field, e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input
          type={type}
          className="mt-1"
          value={formData[field] || ''}
          onChange={e => onChange(field, e.target.value)}
          placeholder={placeholder}
        />
      )}
    </div>
  )
}