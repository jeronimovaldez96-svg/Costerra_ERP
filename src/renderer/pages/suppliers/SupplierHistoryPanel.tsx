// ────────────────────────────────────────────────────────
// Costerra ERP — Supplier History Panel
// Displays the append-only change log for a supplier.
// Mirrors the ProductHistoryPanel pattern exactly.
// ────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { ArrowRight, Clock } from 'lucide-react'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatDateTime } from '../../lib/formatters'
import { useToastStore } from '../../stores/toast.store'

interface HistoryEntry {
    id: number
    supplierId: number
    fieldName: string
    oldValue: string
    newValue: string
    changedAt: string
}

interface SupplierHistoryPanelProps {
    supplierId: number
}

export default function SupplierHistoryPanel({ supplierId }: SupplierHistoryPanelProps) {
    const [entries, setEntries] = useState<HistoryEntry[]>([])
    const [loading, setLoading] = useState(true)
    const { addToast } = useToastStore()

    useEffect(() => {
        async function fetch() {
            setLoading(true)
            try {
                const res = await window.api.invoke(IPC_CHANNELS.SUPPLIER_HISTORY, supplierId)
                if (res.success) setEntries(res.data)
            } catch {
                addToast({ type: 'error', title: 'Load Failed', message: 'Could not load history' })
            } finally {
                setLoading(false)
            }
        }
        fetch()
    }, [supplierId, addToast])

    if (loading) {
        return (
            <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-3 p-3 rounded-lg bg-surface-800/30">
                        <div className="skeleton w-4 h-4 rounded-full" />
                        <div className="flex-1 space-y-2">
                            <div className="skeleton h-3 w-32" />
                            <div className="skeleton h-3 w-48" />
                        </div>
                    </div>
                ))}
            </div>
        )
    }

    if (entries.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 rounded-xl bg-surface-800/60 flex items-center justify-center mb-3">
                    <Clock size={20} className="text-surface-500" />
                </div>
                <p className="text-sm font-medium text-surface-300">No Changes Recorded</p>
                <p className="text-xs text-surface-500 mt-1">
                    Changes will appear here when any field is modified.
                </p>
            </div>
        )
    }

    return (
        <div className="space-y-2">
            {entries.map((entry) => (
                <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-surface-800/30 border border-surface-700/20"
                >
                    <div className="w-2 h-2 rounded-full bg-brand-500 mt-1.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-surface-300 capitalize">
                                {entry.fieldName.replace(/([A-Z])/g, ' $1').trim()}
                            </span>
                            <span className="text-xs text-surface-600">•</span>
                            <span className="text-xs text-surface-500">{formatDateTime(entry.changedAt)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs">
                            <span className="px-2 py-0.5 rounded bg-danger-500/10 text-danger-400 font-mono truncate max-w-[160px]">
                                {entry.oldValue || '(empty)'}
                            </span>
                            <ArrowRight size={12} className="text-surface-600 flex-shrink-0" />
                            <span className="px-2 py-0.5 rounded bg-success-500/10 text-success-400 font-mono truncate max-w-[160px]">
                                {entry.newValue || '(empty)'}
                            </span>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
