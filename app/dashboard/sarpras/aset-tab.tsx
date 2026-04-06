'use client'

import * as React from 'react'
import { useState, useRef, useTransition, useMemo } from 'react'
import { SarprasAset, SarprasKategori, deleteAset, getAsetList } from './actions'
import { AsetFormModal } from './aset-form-modal'
import { Printer, Plus, Search, Filter, Trash2, Edit2, Loader2, Image as ImageIcon } from 'lucide-react'
import { useReactToPrint } from 'react-to-print'

interface AsetTabProps {
  aset: SarprasAset[]
  kategori: SarprasKategori[]
  options: {
    merek: string[]
    asal_anggaran: string[]
    keadaan_barang: string[]
    keterangan: string[]
  }
}

export function AsetTab({ aset: initialAset, kategori, options }: AsetTabProps) {
  const [data, setData] = useState<SarprasAset[]>(initialAset)
  const [isPending, startTransition] = useTransition()
  
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingAset, setEditingAset] = useState<SarprasAset | null>(null)
  
  const [search, setSearch] = useState('')
  const [filterKategori, setFilterKategori] = useState('')
  const [filterKeadaan, setFilterKeadaan] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  
  const printRef = useRef<HTMLDivElement>(null)
  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: 'Laporan_Inventaris_Madrasah',
  })

  // Refetch data jika diperlukan (tapi kita handle locally dulu buat gampang search + active real-time via revalidatePath Next.js)
  // Kalau ada next.js revalidatePath, page akan fresh render initialAset barunya.
  // Tapi local state 'data' juga di update oleh effect supaya responsive, walau server component pass in props.
  useMemo(() => setData(initialAset), [initialAset])

  const filteredData = data.filter(a => {
    let match = true
    if (search) {
      match = match && (
        a.nama_barang.toLowerCase().includes(search.toLowerCase()) || 
        (a.merek || '').toLowerCase().includes(search.toLowerCase())
      )
    }
    if (filterKategori) {
      match = match && a.kategori_id === filterKategori
    }
    if (filterKeadaan) {
      match = match && a.keadaan_barang === filterKeadaan
    }
    if (startDate) {
      match = match && a.tanggal_pembukuan >= startDate
    }
    if (endDate) {
      match = match && a.tanggal_pembukuan <= endDate
    }
    return match
  })

  // Group by category
  const groupedData = filteredData.reduce((acc, curr) => {
    const kat = curr.kategori_nama || 'Tanpa Kategori'
    if (!acc[kat]) acc[kat] = []
    acc[kat].push(curr)
    return acc
  }, {} as Record<string, SarprasAset[]>)

  const handleDelete = (id: string) => {
    if (!confirm('Yakin ingin menghapus data aset ini?')) return
    startTransition(async () => {
      const res = await deleteAset(id)
      if (res.error) alert(res.error)
    })
  }

  const handleEdit = (aset: SarprasAset) => {
    setEditingAset(aset)
    setIsFormOpen(true)
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      {/* TOOLBAR */}
      <div className="flex flex-col xl:flex-row gap-4 justify-between items-start xl:items-center">
        <div className="flex flex-wrap gap-3 items-center w-full xl:w-auto">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Cari barang / merek..." 
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 w-[200px]"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-400" />
            <select 
              value={filterKategori} 
              onChange={e => setFilterKategori(e.target.value)}
              className="py-2 px-3 text-sm border rounded-lg focus:outline-none bg-white min-w-[150px]"
            >
              <option value="">Semua Kategori</option>
              {kategori.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
            </select>
            <select 
              value={filterKeadaan} 
              onChange={e => setFilterKeadaan(e.target.value)}
              className="py-2 px-3 text-sm border rounded-lg focus:outline-none bg-white"
            >
              <option value="">Semua Kondisi</option>
              <option value="BAIK">Baik</option>
              <option value="KURANG BAIK">Kurang Baik</option>
              <option value="RUSAK">Rusak</option>
            </select>
          </div>
          <div className="flex items-center gap-2 bg-white border rounded-lg px-2 h-[38px]">
             <span className="text-xs text-slate-500 font-medium whitespace-nowrap hidden sm:inline">Periode:</span>
             <input type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} className="text-sm outline-none bg-transparent" title="Dari Tanggal" />
             <span className="text-slate-300">-</span>
             <input type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} className="text-sm outline-none bg-transparent" title="Sampai Tanggal" />
          </div>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="w-4 h-4" /> Cetak PDF
          </button>
          <button 
            onClick={() => { setEditingAset(null); setIsFormOpen(true) }}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" /> Tambah Aset
          </button>
        </div>
      </div>

      {/* TABLE */}
      <div className="border rounded-xl bg-white shadow-sm overflow-hidden overflow-x-auto relative min-h-[400px]">
        {isPending && (
          <div className="absolute inset-0 bg-white/50 z-10 flex items-center justify-center backdrop-blur-sm">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
          </div>
        )}
        <table className="w-full text-sm text-left">
          <thead className="bg-slate-50 text-slate-600 border-b">
            <tr>
              <th className="py-3 px-4 font-semibold w-12 text-center">No</th>
              <th className="py-3 px-4 font-semibold">Nama & Merek</th>
              <th className="py-3 px-4 font-semibold">Kuantitas</th>
              <th className="py-3 px-4 font-semibold">Tahun / Tgl</th>
              <th className="py-3 px-4 font-semibold">Sumber Dana</th>
              <th className="py-3 px-4 font-semibold">Keadaan</th>
              <th className="py-3 px-4 font-semibold">Harga</th>
              <th className="py-3 px-4 font-semibold text-center">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Object.keys(groupedData).length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-slate-500">Data aset tidak ditemukan</td></tr>
            ) : (
              Object.entries(groupedData).map(([kategoriName, items]) => (
                <React.Fragment key={kategoriName}>
                  {/* Header Group */}
                  <tr className="bg-blue-50/50">
                    <td colSpan={8} className="py-2 px-4 font-semibold text-blue-700 text-[13px] uppercase tracking-wider">
                      {kategoriName} ({items.length} item)
                    </td>
                  </tr>
                  {items.map((item, index) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                      <td className="py-3 px-4 text-center text-slate-500">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {item.foto_url ? (
                            <img src={item.foto_url} alt="foto" className="w-10 h-10 rounded object-cover border" />
                          ) : (
                            <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-300 border">
                              <ImageIcon className="w-5 h-5" />
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-slate-800">{item.nama_barang}</div>
                            <div className="text-xs text-slate-500">{item.merek || '-'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-semibold text-slate-700">{item.kuantitas}</td>
                      <td className="py-3 px-4">
                        <div className="text-slate-800">{item.tahun_pembuatan || '-'}</div>
                        <div className="text-[11px] text-slate-400">{item.tanggal_pembukuan}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs">
                          {item.asal_anggaran || '-'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          item.keadaan_barang === 'BAIK' ? 'bg-green-100 text-green-700' :
                          item.keadaan_barang === 'KURANG BAIK' ? 'bg-amber-100 text-amber-700' :
                          item.keadaan_barang === 'RUSAK' ? 'bg-red-100 text-red-700' :
                          'bg-slate-100 text-slate-600'
                        }`}>
                          {item.keadaan_barang || '-'}
                        </span>
                        {item.keterangan && <div className="text-[11px] text-slate-500 mt-1">{item.keterangan}</div>}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs">
                        {item.harga ? `Rp ${item.harga.toLocaleString('id-ID')}` : '-'}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => handleEdit(item)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(item.id)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Hapus">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* HIDDEN PRINT CONTENT */}
      <div className="hidden">
        <div ref={printRef} className="p-8 font-sans bg-white text-black">
          <div className="text-center mb-8 border-b-2 border-black pb-4">
            <h2 className="text-xl font-bold uppercase">Buku Inventaris (Sarana & Prasarana)</h2>
            <p className="font-semibold text-lg">MTS KH. A. WAHAB MUHSIN SUKAHIDENG</p>
            <p className="text-sm mt-1">Dicetak pada: {new Date().toLocaleDateString('id-ID')} | Kriteria: Semua / Terfilter</p>
          </div>
          
          <table className="w-full text-xs text-left border-collapse border border-black printable-table">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-black p-2 text-center">No</th>
                <th className="border border-black p-2">Tgl Buku</th>
                <th className="border border-black p-2">Nama Barang / Merek</th>
                <th className="border border-black p-2 text-center">Jml</th>
                <th className="border border-black p-2 text-center">Tahun</th>
                <th className="border border-black p-2">Asal</th>
                <th className="border border-black p-2">Keadaan</th>
                <th className="border border-black p-2 text-right">Harga</th>
                <th className="border border-black p-2">Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedData).map(([kat, items]) => (
                <React.Fragment key={kat}>
                  <tr className="bg-gray-200">
                    <td colSpan={9} className="border border-black p-2 font-bold uppercase">{kat}</td>
                  </tr>
                  {items.map((it, idx) => (
                    <tr key={it.id}>
                      <td className="border border-black p-2 text-center">{idx + 1}</td>
                      <td className="border border-black p-2">{it.tanggal_pembukuan}</td>
                      <td className="border border-black p-2 font-medium">
                        {it.nama_barang}
                        {it.merek && <div className="text-gray-600 mt-0.5">{it.merek}</div>}
                      </td>
                      <td className="border border-black p-2 text-center">{it.kuantitas}</td>
                      <td className="border border-black p-2 text-center">{it.tahun_pembuatan || '-'}</td>
                      <td className="border border-black p-2">{it.asal_anggaran || '-'}</td>
                      <td className="border border-black p-2">{it.keadaan_barang || '-'}</td>
                      <td className="border border-black p-2 text-right">{it.harga ? `Rp ${it.harga.toLocaleString('id-ID')}` : '-'}</td>
                      <td className="border border-black p-2">{it.keterangan || '-'}</td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AsetFormModal 
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        kategori={kategori}
        options={options}
        initialData={editingAset}
      />
    </div>
  )
}
