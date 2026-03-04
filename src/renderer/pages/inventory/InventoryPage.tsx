// ────────────────────────────────────────────────────────
// Costerra ERP — Inventory Page (Full Implementation)
// Displays aggregated stock summary per SKU and
// individual FIFO batches.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Warehouse, TrendingUp } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatNumber } from '../../lib/formatters'

interface InventorySummary {
    productId: number
    skuNumber: string
    productName: string
    productGroup: string
    productFamily: string
    color: string
    totalUnits: number
    availableUnits: number
    reservedUnits: number
    avgUnitCost: number
    totalStockValue: number
}

const columnHelper = createColumnHelper<InventorySummary>()

export default function InventoryPage() {
    const [inventory, setInventory] = useState<InventorySummary[]>([])
    const [loading, setLoading] = useState(true)
    const { addToast } = useToastStore()

    const fetchInventory = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.INVENTORY_SUMMARY)
            if (res.success) setInventory(res.data)
        } catch {
            addToast({ type: 'error', title: 'Load Failed' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchInventory() }, [fetchInventory])

    // ─── Computed Totals ───────────────────────────────
    const totalStockValue = inventory.reduce((sum, i) => sum + i.totalStockValue, 0)
    const totalUnits = inventory.reduce((sum, i) => sum + i.totalUnits, 0)
    const totalSKUs = inventory.length

    const columns = useMemo(
        () => [
            columnHelper.accessor('skuNumber', {
                header: 'SKU',
                cell: (info) => <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
            }),
            columnHelper.accessor('productName', {
                header: 'Product',
                cell: (info) => <span className="font-medium text-surface-100">{info.getValue()}</span>
            }),
            columnHelper.accessor('productGroup', { header: 'Group' }),
            columnHelper.accessor('color', {
                header: 'Color',
                cell: (info) => <span className="badge-neutral">{info.getValue()}</span>
            }),
            columnHelper.accessor('totalUnits', {
                header: 'Total Units',
                cell: (info) => <span className="font-medium">{formatNumber(info.getValue())}</span>
            }),
            columnHelper.accessor('availableUnits', {
                header: 'Available',
                cell: (info) => {
                    const val = info.getValue()
                    return (
                        <span className={val > 0 ? 'text-success-500' : 'text-danger-500'}>
                            {formatNumber(val)}
                        </span>
                    )
                }
            }),
            columnHelper.accessor('avgUnitCost', {
                header: 'Avg Cost',
                cell: (info) => formatCurrency(info.getValue())
            }),
            columnHelper.accessor('totalStockValue', {
                header: 'Stock Value',
                cell: (info) => (
                    <span className="font-medium text-surface-100">{formatCurrency(info.getValue())}</span>
                )
            })
        ],
        []
    )

    return (
        <PageShell
            title="Inventory"
            description="FIFO stock tracking and current inventory levels"
        >
            {/* ─── Summary Cards ────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400">
                            <TrendingUp size={18} />
                        </div>
                        <span className="text-sm text-surface-400">Total Stock Value</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{formatCurrency(totalStockValue)}</span>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-success-500/10 text-success-500">
                            <Warehouse size={18} />
                        </div>
                        <span className="text-sm text-surface-400">Total Units in Stock</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{formatNumber(totalUnits)}</span>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-warning-500/10 text-warning-500">
                            <Warehouse size={18} />
                        </div>
                        <span className="text-sm text-surface-400">Active SKUs</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{totalSKUs}</span>
                </div>
            </div>

            <DataTable
                data={inventory}
                columns={columns}
                searchPlaceholder="Search by SKU, product name, group..."
                exportFilename="inventory"
                loading={loading}
                emptyIcon={<Warehouse size={24} className="text-surface-500" />}
                emptyTitle="No Inventory Data"
                emptyMessage="Inventory updates automatically when purchase orders are marked as delivered."
            />
        </PageShell>
    )
}
