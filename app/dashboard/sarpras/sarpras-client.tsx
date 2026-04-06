'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Package, BarChart3, Settings } from 'lucide-react'
import { SarprasAset, SarprasKategori } from './actions'
import { AsetTab } from './aset-tab'
import { StatistikTab } from './statistik-tab'
import { KategoriModal } from './kategori-modal'

interface SarprasClientProps {
  initialAset: SarprasAset[]
  initialKategori: SarprasKategori[]
  options: {
    merek: string[]
    asal_anggaran: string[]
    keadaan_barang: string[]
    keterangan: string[]
  }
}

export function SarprasClient({ initialAset, initialKategori, options }: SarprasClientProps) {
  const [activeTab, setActiveTab] = useState('data')
  const [isKategoriOpen, setIsKategoriOpen] = useState(false)

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
          <TabsList className="grid w-full sm:w-auto grid-cols-2 lg:w-[400px]">
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Package className="w-4 h-4" /> Data Aset
            </TabsTrigger>
            <TabsTrigger value="statistik" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> Statistik
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {activeTab === 'data' && (
          <button 
            onClick={() => setIsKategoriOpen(true)}
            className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors bg-white border px-3 py-1.5 rounded-md shadow-sm"
          >
            <Settings className="w-4 h-4" /> Kelola Kategori
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200">
        <TabsContent value="data" className="p-0 m-0 outline-none">
          <AsetTab aset={initialAset} kategori={initialKategori} options={options} />
        </TabsContent>
        <TabsContent value="statistik" className="p-0 m-0 outline-none">
          <StatistikTab aset={initialAset} kategori={initialKategori} />
        </TabsContent>
      </div>

      <KategoriModal 
        isOpen={isKategoriOpen} 
        onClose={() => setIsKategoriOpen(false)} 
        kategori={initialKategori} 
      />
    </div>
  )
}
