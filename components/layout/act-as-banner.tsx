// components/layout/act-as-banner.tsx
'use client'

import { useState, useTransition } from 'react'
import { UserCog, X, ChevronDown, Shield, Search } from 'lucide-react'
import { setActAsUser, clearActAs } from '@/lib/act-as-actions'
import { useRouter } from 'next/navigation'
import { getRoleLabel } from '@/config/menu'

interface ActAsBannerProps {
  /** Apakah sedang act-as? */
  isActingAs: boolean
  /** Nama guru yang di-act-as-kan */
  actAsName: string | null
  /** Daftar guru yang bisa dipilih */
  userList: Array<{ id: string; nama_lengkap: string; role: string }>
  /** Real user name (admin) */
  adminName: string
}

export function ActAsBanner({ isActingAs, actAsName, userList, adminName }: ActAsBannerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const filteredUsers = userList.filter(u =>
    u.nama_lengkap.toLowerCase().includes(search.toLowerCase())
  )

  const handleSelect = (userId: string) => {
    startTransition(async () => {
      await setActAsUser(userId)
      setIsOpen(false)
      setSearch('')
      router.refresh()
    })
  }

  const handleClear = () => {
    startTransition(async () => {
      await clearActAs()
      router.refresh()
    })
  }

  // ── ACTIVE BANNER: sedang act-as ──
  if (isActingAs) {
    return (
      <div className="relative rounded-xl border-2 border-amber-300 dark:border-amber-600 bg-gradient-to-r from-amber-50 via-orange-50 to-amber-50 dark:from-amber-950/50 dark:via-orange-950/30 dark:to-amber-950/50 px-4 py-3 shadow-sm animate-in slide-in-from-top-2 duration-300">
        <div className="flex items-center gap-3">
          {/* Icon */}
          <div className="shrink-0 p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 border border-amber-200 dark:border-amber-700">
            <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-600/80 dark:text-amber-400/80 leading-none mb-0.5">
              Mode Act As · Super Admin
            </p>
            <p className="text-sm font-bold text-amber-900 dark:text-amber-100 truncate">
              Bertindak sebagai: {actAsName}
            </p>
            <p className="text-[11px] text-amber-600/70 dark:text-amber-400/60 mt-0.5">
              Data & input akan atas nama guru di atas. Admin: {adminName}
            </p>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1.5">
            <button
              onClick={() => setIsOpen(!isOpen)}
              disabled={isPending}
              className="text-[11px] font-medium text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 bg-amber-100 dark:bg-amber-800/50 hover:bg-amber-200 dark:hover:bg-amber-800 border border-amber-200 dark:border-amber-700 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Ganti
            </button>
            <button
              onClick={handleClear}
              disabled={isPending}
              className="p-1.5 rounded-lg text-amber-500 dark:text-amber-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
              title="Kembali ke akun sendiri"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Dropdown ganti guru */}
        {isOpen && (
          <div className="mt-3 pt-3 border-t border-amber-200 dark:border-amber-700">
            <UserDropdown
              users={filteredUsers}
              search={search}
              onSearch={setSearch}
              onSelect={handleSelect}
              isPending={isPending}
            />
          </div>
        )}
      </div>
    )
  }

  // ── INACTIVE: button untuk memulai act-as ──
  return (
    <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 px-4 py-3 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="shrink-0 p-2 rounded-lg bg-violet-50 dark:bg-violet-900/30 border border-violet-100 dark:border-violet-800">
          <UserCog className="h-4 w-4 text-violet-500 dark:text-violet-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">Fitur Act As</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Pilih guru untuk bertindak atas namanya di halaman ini
          </p>
        </div>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={isPending}
          className="shrink-0 flex items-center gap-1.5 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-800 dark:hover:text-violet-300 bg-violet-50 dark:bg-violet-900/30 hover:bg-violet-100 dark:hover:bg-violet-900/50 border border-violet-200 dark:border-violet-700 px-3 py-2 rounded-lg transition-colors"
        >
          <UserCog className="h-3.5 w-3.5" />
          Pilih Guru
          <ChevronDown className={`h-3.5 w-3.5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
          <UserDropdown
            users={filteredUsers}
            search={search}
            onSearch={setSearch}
            onSelect={handleSelect}
            isPending={isPending}
          />
        </div>
      )}
    </div>
  )
}

// ── Sub: User Dropdown ──
function UserDropdown({
  users, search, onSearch, onSelect, isPending
}: {
  users: Array<{ id: string; nama_lengkap: string; role: string }>
  search: string
  onSearch: (v: string) => void
  onSelect: (id: string) => void
  isPending: boolean
}) {
  return (
    <div className="space-y-2">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
        <input
          type="text"
          value={search}
          onChange={e => onSearch(e.target.value)}
          placeholder="Cari nama guru..."
          className="w-full pl-8 pr-3 py-2 text-sm bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:border-violet-300 dark:focus:border-violet-600 placeholder:text-slate-400 dark:placeholder:text-slate-500 text-slate-800 dark:text-slate-200"
          autoFocus
        />
      </div>

      {/* List */}
      <div className="max-h-60 overflow-y-auto rounded-lg border border-slate-100 dark:border-slate-700 divide-y divide-slate-50 dark:divide-slate-700/50 bg-white dark:bg-slate-800">
        {users.length === 0 ? (
          <div className="px-3 py-4 text-center text-xs text-slate-400">
            Tidak ada guru ditemukan
          </div>
        ) : (
          users.map(u => (
            <button
              key={u.id}
              onClick={() => onSelect(u.id)}
              disabled={isPending}
              className="w-full text-left px-3 py-2.5 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition-colors flex items-center gap-2.5 disabled:opacity-50"
            >
              <div className="h-7 w-7 rounded-full bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400">
                  {u.nama_lengkap.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200 truncate">
                  {u.nama_lengkap}
                </p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">
                  {getRoleLabel(u.role)}
                </p>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
