'use client'

import { useMemo } from 'react'
import { SarprasAset, SarprasKategori } from './actions'
import { PackageOpen, AlertTriangle, CheckCircle2, DollarSign, BarChart3 } from 'lucide-react'

export function StatistikTab({ aset, kategori }: { aset: SarprasAset[], kategori: SarprasKategori[] }) {
  
  const stats = useMemo(() => {
    let totalValue = 0
    let totalItems = 0
    let baik = 0
    let rusak = 0
    let kurangBaik = 0
    
    // items count by category
    const byCategory: Record<string, number> = {}

    for (const a of aset) {
      const q = a.kuantitas || 1
      totalItems += q
      totalValue += (a.harga || 0) * q
      
      const st = a.keadaan_barang?.toUpperCase() || ''
      if (st === 'BAIK') baik += q
      else if (st === 'RUSAK') rusak += q
      else if (st === 'KURANG BAIK') kurangBaik += q

      const katName = a.kategori_nama || 'Tanpa Kategori'
      byCategory[katName] = (byCategory[katName] || 0) + q
    }

    return { totalValue, totalItems, baik, rusak, kurangBaik, byCategory }
  }, [aset])

  return (
    <div className="p-4 sm:p-6 space-y-6">
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Aset */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <PackageOpen className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Total Kuantitas Aset</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.totalItems.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 2: Kondisi Baik */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Kondisi Baik</p>
            <h3 className="text-2xl font-bold text-slate-800">{stats.baik.toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 3: Rusak */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-red-100 text-red-600 rounded-lg">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Rusak / Perlu Perbaikan</p>
            <h3 className="text-2xl font-bold text-slate-800">{(stats.rusak + stats.kurangBaik).toLocaleString('id-ID')}</h3>
          </div>
        </div>

        {/* Card 4: Nilai Aset */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
            <DollarSign className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500">Estimasi Nilai Aset</p>
            <h3 className="text-lg sm:text-xl font-bold text-slate-800">Rp {stats.totalValue.toLocaleString('id-ID')}</h3>
          </div>
        </div>
      </div>

      {/* Grid for more detailed breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white border rounded-xl shadow-sm p-5">
          <h4 className="font-semibold text-slate-800 mb-4 pb-2 border-b">Sebaran Berdasarkan Kategori</h4>
          {Object.keys(stats.byCategory).length === 0 ? (
            <p className="text-slate-500 text-sm">Belum ada data.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(stats.byCategory).sort((a,b) => b[1] - a[1]).map(([name, count]) => (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-slate-700">{name}</span>
                    <span className="text-slate-500">{count} item ({(count / Math.max(1, stats.totalItems) * 100).toFixed(1)}%)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full" 
                      style={{ width: `${(count / Math.max(1, stats.totalItems)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="bg-white border rounded-xl shadow-sm p-5 flex flex-col justify-center items-center text-center">
          <div className="bg-slate-50 rounded-full p-8 border border-slate-100 mb-4">
             <BarChart3 className="w-16 h-16 text-slate-300" />
          </div>
          <h4 className="font-medium text-slate-700">Grafik Lanjut</h4>
          <p className="text-sm text-slate-500 mt-2 max-w-sm">
            Statistik dan laporan analitik lanjutan dapat ditambahkan di sini berdasarkan request spesifik.
          </p>
        </div>
      </div>

    </div>
  )
}
