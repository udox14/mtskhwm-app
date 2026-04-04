'use client'

import { useState, useTransition, useCallback } from 'react'
import { MENU_ITEMS, ALL_ROLES, getRoleLabel } from '@/config/menu'
import { toggleRoleFeature } from './actions'
import { cn } from '@/lib/utils'
import {
  ToggleLeft, ToggleRight, Shield, Layers, Check, X,
  Loader2, Search, Info
} from 'lucide-react'
import { Input } from '@/components/ui/input'

type ViewMode = 'per-fitur' | 'per-role'

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  super_admin: { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', dot: 'bg-rose-500' },
  admin_tu: { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', dot: 'bg-violet-500' },
  kepsek: { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', dot: 'bg-amber-500' },
  wakamad: { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', dot: 'bg-blue-500' },
  guru: { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  guru_bk: { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', dot: 'bg-cyan-500' },
  guru_piket: { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200', dot: 'bg-teal-500' },
  wali_kelas: { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', dot: 'bg-indigo-500' },
  resepsionis: { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-200', dot: 'bg-pink-500' },
  guru_ppl: { bg: 'bg-lime-50', text: 'text-lime-700', border: 'border-lime-200', dot: 'bg-lime-500' },
}

const DEFAULT_ROLE_COLOR = { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-200', dot: 'bg-slate-500' }

// Features yang tidak boleh dibuang dari super_admin
const LOCKED_FEATURES = new Set(['dashboard', 'settings', 'settings-fitur'])

interface FiturClientProps {
  initialMatrix: Record<string, string[]>
}

export function FiturClient({ initialMatrix }: FiturClientProps) {
  const [matrix, setMatrix] = useState(initialMatrix)
  const [viewMode, setViewMode] = useState<ViewMode>('per-fitur')
  const [searchTerm, setSearchTerm] = useState('')
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [isPending, startTransition] = useTransition()

  // Get filtered features
  const features = MENU_ITEMS.filter(item =>
    item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleToggle = useCallback(async (role: string, featureId: string, currentEnabled: boolean) => {
    // Prevent removing locked features from super_admin
    if (role === 'super_admin' && LOCKED_FEATURES.has(featureId) && currentEnabled) return

    const key = `${role}:${featureId}`
    setPendingKeys(prev => new Set(prev).add(key))

    // Optimistic update
    setMatrix(prev => {
      const newMatrix = { ...prev }
      const roleFeatures = [...(newMatrix[role] || [])]
      if (currentEnabled) {
        newMatrix[role] = roleFeatures.filter(f => f !== featureId)
      } else {
        roleFeatures.push(featureId)
        newMatrix[role] = roleFeatures
      }
      return newMatrix
    })

    startTransition(async () => {
      const res = await toggleRoleFeature(role, featureId, !currentEnabled)
      if (res?.error) {
        // Revert on error
        setMatrix(prev => {
          const newMatrix = { ...prev }
          const roleFeatures = [...(newMatrix[role] || [])]
          if (!currentEnabled) {
            newMatrix[role] = roleFeatures.filter(f => f !== featureId)
          } else {
            roleFeatures.push(featureId)
            newMatrix[role] = roleFeatures
          }
          return newMatrix
        })
        alert(res.error)
      }
      setPendingKeys(prev => {
        const next = new Set(prev)
        next.delete(key)
        return next
      })
    })
  }, [startTransition])

  const getEnabledCount = (featureId: string) =>
    ALL_ROLES.filter(r => matrix[r.value]?.includes(featureId)).length

  const getFeatureCount = (role: string) =>
    (matrix[role] || []).length

  return (
    <div className="space-y-3">
      {/* TOOLBAR */}
      <div className="bg-surface border border-surface rounded-xl p-3 flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-0" style={{ minWidth: '160px' }}>
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
          <Input
            placeholder="Cari fitur..."
            className="pl-8 h-8 text-sm rounded-md"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('per-fitur')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'per-fitur'
                ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Layers className="h-3.5 w-3.5" /> Per Fitur
          </button>
          <button
            onClick={() => setViewMode('per-role')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all',
              viewMode === 'per-role'
                ? 'bg-white dark:bg-slate-700 text-violet-700 dark:text-violet-300 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            )}
          >
            <Shield className="h-3.5 w-3.5" /> Per Role
          </button>
        </div>
      </div>

      {/* Info bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-violet-50 dark:bg-violet-950/30 border border-violet-200 dark:border-violet-800 rounded-lg">
        <Info className="h-3.5 w-3.5 text-violet-500 shrink-0" />
        <p className="text-[11px] text-violet-700 dark:text-violet-300">
          {viewMode === 'per-fitur'
            ? 'Klik toggle untuk mengaktifkan/menonaktifkan fitur untuk role tertentu. Perubahan langsung tersimpan.'
            : 'Pilih role lalu atur fitur mana saja yang bisa diakses. Perubahan langsung tersimpan.'
          }
        </p>
      </div>

      {/* CONTENT */}
      {viewMode === 'per-fitur' ? (
        <PerFiturView
          features={features}
          matrix={matrix}
          pendingKeys={pendingKeys}
          onToggle={handleToggle}
          getEnabledCount={getEnabledCount}
        />
      ) : (
        <PerRoleView
          features={features}
          matrix={matrix}
          pendingKeys={pendingKeys}
          onToggle={handleToggle}
          getFeatureCount={getFeatureCount}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// VIEW: Per Fitur
// ════════════════════════════════════════════════════════
function PerFiturView({
  features, matrix, pendingKeys, onToggle, getEnabledCount
}: {
  features: typeof MENU_ITEMS
  matrix: Record<string, string[]>
  pendingKeys: Set<string>
  onToggle: (role: string, featureId: string, enabled: boolean) => void
  getEnabledCount: (featureId: string) => number
}) {
  return (
    <div className="space-y-2">
      {features.map(feature => {
        const Icon = feature.icon
        const count = getEnabledCount(feature.id)
        return (
          <div key={feature.id} className="bg-surface border border-surface rounded-xl overflow-hidden">
            {/* Feature header */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-2">
              <div className="p-1.5 rounded-md bg-violet-50 dark:bg-violet-950/40 border border-violet-200 dark:border-violet-800">
                <Icon className="h-3.5 w-3.5 text-violet-600 dark:text-violet-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{feature.title}</p>
                <p className="text-[10px] text-slate-400">{feature.href}</p>
              </div>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                {count}/{ALL_ROLES.length} role
              </span>
            </div>
            {/* Role toggles */}
            <div className="p-3 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5">
              {ALL_ROLES.map(role => {
                const enabled = matrix[role.value]?.includes(feature.id) ?? false
                const key = `${role.value}:${feature.id}`
                const loading = pendingKeys.has(key)
                const locked = role.value === 'super_admin' && LOCKED_FEATURES.has(feature.id) && enabled
                const colors = ROLE_COLORS[role.value] || DEFAULT_ROLE_COLOR

                return (
                  <button
                    key={role.value}
                    onClick={() => !locked && onToggle(role.value, feature.id, enabled)}
                    disabled={loading || locked}
                    className={cn(
                      'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-left transition-all duration-150',
                      enabled
                        ? cn(colors.bg, colors.border, 'dark:bg-opacity-20')
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-50 hover:opacity-80',
                      locked && 'cursor-not-allowed',
                      !locked && !loading && 'hover:shadow-sm'
                    )}
                  >
                    {loading ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />
                    ) : enabled ? (
                      <div className={cn('h-4 w-4 rounded flex items-center justify-center shrink-0', colors.dot)}>
                        <Check className="h-2.5 w-2.5 text-white" />
                      </div>
                    ) : (
                      <div className="h-4 w-4 rounded border-2 border-slate-300 dark:border-slate-600 shrink-0" />
                    )}
                    <span className={cn(
                      'text-xs font-medium truncate',
                      enabled ? colors.text : 'text-slate-400 dark:text-slate-500'
                    )}>
                      {role.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ════════════════════════════════════════════════════════
// VIEW: Per Role
// ════════════════════════════════════════════════════════
function PerRoleView({
  features, matrix, pendingKeys, onToggle, getFeatureCount
}: {
  features: typeof MENU_ITEMS
  matrix: Record<string, string[]>
  pendingKeys: Set<string>
  onToggle: (role: string, featureId: string, enabled: boolean) => void
  getFeatureCount: (role: string) => number
}) {
  const [selectedRole, setSelectedRole] = useState<string>(ALL_ROLES[0].value)
  const count = getFeatureCount(selectedRole)
  const colors = ROLE_COLORS[selectedRole] || DEFAULT_ROLE_COLOR

  return (
    <div className="space-y-3">
      {/* Role selector cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
        {ALL_ROLES.map(role => {
          const rc = ROLE_COLORS[role.value] || DEFAULT_ROLE_COLOR
          const isSelected = selectedRole === role.value
          const fc = getFeatureCount(role.value)

          return (
            <button
              key={role.value}
              onClick={() => setSelectedRole(role.value)}
              className={cn(
                'flex flex-col items-start gap-1 px-3 py-2.5 rounded-xl border transition-all duration-150',
                isSelected
                  ? cn(rc.bg, rc.border, 'shadow-sm ring-2 ring-offset-1', `ring-${role.value === 'super_admin' ? 'rose' : role.value === 'admin_tu' ? 'violet' : 'slate'}-300`)
                  : 'bg-surface border-surface hover:border-slate-300 hover:shadow-sm'
              )}
            >
              <div className="flex items-center gap-2 w-full">
                <div className={cn('h-2 w-2 rounded-full shrink-0', rc.dot)} />
                <span className={cn(
                  'text-xs font-semibold truncate',
                  isSelected ? rc.text : 'text-slate-600 dark:text-slate-300'
                )}>
                  {role.label}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 pl-4">
                {fc} fitur aktif
              </span>
            </button>
          )
        })}
      </div>

      {/* Feature list for selected role */}
      <div className="bg-surface border border-surface rounded-xl overflow-hidden">
        <div className={cn('flex items-center gap-3 px-4 py-3 border-b', colors.border, colors.bg)}>
          <div className={cn('h-3 w-3 rounded-full shrink-0', colors.dot)} />
          <div className="flex-1">
            <p className={cn('text-sm font-semibold', colors.text)}>
              {getRoleLabel(selectedRole)}
            </p>
            <p className="text-[10px] text-slate-400">
              {count} dari {MENU_ITEMS.length} fitur aktif
            </p>
          </div>
        </div>

        <div className="p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
          {features.map(feature => {
            const enabled = matrix[selectedRole]?.includes(feature.id) ?? false
            const key = `${selectedRole}:${feature.id}`
            const loading = pendingKeys.has(key)
            const locked = selectedRole === 'super_admin' && LOCKED_FEATURES.has(feature.id) && enabled
            const Icon = feature.icon

            return (
              <button
                key={feature.id}
                onClick={() => !locked && onToggle(selectedRole, feature.id, enabled)}
                disabled={loading || locked}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-all duration-150 text-left',
                  enabled
                    ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
                    : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 opacity-60 hover:opacity-90',
                  locked && 'cursor-not-allowed',
                  !locked && !loading && 'hover:shadow-sm'
                )}
              >
                <div className={cn(
                  'p-1 rounded shrink-0',
                  enabled ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-slate-100 dark:bg-slate-800'
                )}>
                  <Icon className={cn(
                    'h-3.5 w-3.5',
                    enabled ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                  )} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    'text-xs font-medium truncate',
                    enabled ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400'
                  )}>
                    {feature.title}
                  </p>
                </div>
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-400 shrink-0" />
                ) : enabled ? (
                  <div className="h-4.5 w-4.5 rounded-full bg-emerald-500 flex items-center justify-center shrink-0" style={{width:'18px',height:'18px'}}>
                    <Check className="h-2.5 w-2.5 text-white" />
                  </div>
                ) : (
                  <div className="h-4.5 w-4.5 rounded-full border-2 border-slate-300 dark:border-slate-600 shrink-0" style={{width:'18px',height:'18px'}} />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
