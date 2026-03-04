// ────────────────────────────────────────────────────────
// Costerra ERP — Sales Page (Full Implementation)
// Sales ledger with revenue, cost, and profit data.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { DollarSign, TrendingUp, TrendingDown } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatPercent, formatDate } from '../../lib/formatters'

interface SaleLineItem {
    id: number
    product: { skuNumber: string; name: string }
    quantity: number
    unitPrice: number
    blendedUnitCost: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
}

interface Sale {
    id: number
    saleNumber: string
    totalRevenue: number
    totalCost: number
    profitAmount: number
    profitMargin: number
    saleDate: string
    lineItems: SaleLineItem[]
    quote: {
        quoteNumber: string
        salesLead: {
            leadNumber: string
            name: string
            client: { name: string; surname: string; clientNumber: string }
        }
    }
}

const columnHelper = createColumnHelper<Sale>()

export default function SalesPage() {
    const [sales, setSales] = useState<Sale[]>([])
    const [loading, setLoading] = useState(true)
    const [detailSale, setDetailSale] = useState<Sale | null>(null)
    const { addToast } = useToastStore()

    const fetchSales = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.SALE_LIST, {})
            if (res.success) setSales(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchSales() }, [fetchSales])

    // ─── Computed Totals ───────────────────────────────
    const totals = useMemo(() => {
        const totalRevenue = sales.reduce((sum, s) => sum + s.totalRevenue, 0)
        const totalCost = sales.reduce((sum, s) => sum + s.totalCost, 0)
        const totalProfit = totalRevenue - totalCost
        const blendedMargin = totalRevenue > 0 ? ((totalRevenue - totalCost) / totalRevenue) * 100 : 0
        return { totalRevenue, totalCost, totalProfit, blendedMargin }
    }, [sales])

    const columns = useMemo(
        () => [
            columnHelper.accessor('saleNumber', {
                header: 'Sale #',
                cell: (info) => <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
            }),
            columnHelper.accessor((row) => `${row.quote.salesLead.client.name} ${row.quote.salesLead.client.surname}`, {
                id: 'client',
                header: 'Client',
                cell: (info) => <span className="font-medium text-surface-100">{info.getValue()}</span>
            }),
            columnHelper.accessor((row) => row.quote.salesLead.name, {
                id: 'lead',
                header: 'Lead'
            }),
            columnHelper.accessor('totalRevenue', {
                header: 'Revenue',
                cell: (info) => <span className="text-success-500 font-medium">{formatCurrency(info.getValue())}</span>
            }),
            columnHelper.accessor('totalCost', {
                header: 'Cost',
                cell: (info) => formatCurrency(info.getValue())
            }),
            columnHelper.accessor('profitAmount', {
                header: 'Profit',
                cell: (info) => {
                    const val = info.getValue()
                    return <span className={val >= 0 ? 'text-success-500' : 'text-danger-500'}>{formatCurrency(val)}</span>
                }
            }),
            columnHelper.accessor('profitMargin', {
                header: 'Margin',
                cell: (info) => {
                    const val = info.getValue()
                    return <span className={val >= 20 ? 'text-success-500' : val >= 10 ? 'text-warning-500' : 'text-danger-500'}>{formatPercent(val)}</span>
                }
            }),
            columnHelper.accessor('saleDate', {
                header: 'Date',
                cell: (info) => formatDate(info.getValue())
            })
        ],
        []
    )

    return (
        <PageShell
            title="Sales"
            description="View completed sales, revenue, costs, and profit margins"
        >
            {/* ─── Summary Cards ────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-2">
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-success-500/10 text-success-500"><DollarSign size={18} /></div>
                        <span className="text-sm text-surface-400">Total Revenue</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{formatCurrency(totals.totalRevenue)}</span>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-danger-500/10 text-danger-500"><TrendingDown size={18} /></div>
                        <span className="text-sm text-surface-400">Total Cost</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{formatCurrency(totals.totalCost)}</span>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-brand-500/10 text-brand-400"><TrendingUp size={18} /></div>
                        <span className="text-sm text-surface-400">Total Profit</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{formatCurrency(totals.totalProfit)}</span>
                </div>
                <div className="stat-card">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-warning-500/10 text-warning-500"><TrendingUp size={18} /></div>
                        <span className="text-sm text-surface-400">Blended Margin</span>
                    </div>
                    <span className="text-2xl font-semibold text-surface-50">{formatPercent(totals.blendedMargin)}</span>
                </div>
            </div>

            <DataTable
                data={sales}
                columns={columns}
                searchPlaceholder="Search sales..."
                exportFilename="sales-ledger"
                loading={loading}
                onRowClick={(s) => setDetailSale(s)}
                emptyIcon={<DollarSign size={24} className="text-surface-500" />}
                emptyTitle="No Sales Yet"
                emptyMessage="Sales are recorded when a quote is executed."
            />

            {/* ─── Sale Detail Modal ────────────────────────── */}
            <Modal
                isOpen={!!detailSale}
                onClose={() => setDetailSale(null)}
                title={`Sale — ${detailSale?.saleNumber ?? ''}`}
                description={`Client: ${detailSale?.quote.salesLead.client.name ?? ''} ${detailSale?.quote.salesLead.client.surname ?? ''} • Quote: ${detailSale?.quote.quoteNumber ?? ''}`}
                size="lg"
            >
                {detailSale && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-4 gap-3">
                            <div className="p-3 rounded-lg bg-surface-800/30 text-center">
                                <p className="text-xs text-surface-500">Revenue</p>
                                <p className="text-sm font-semibold text-success-500">{formatCurrency(detailSale.totalRevenue)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-surface-800/30 text-center">
                                <p className="text-xs text-surface-500">Cost</p>
                                <p className="text-sm font-semibold">{formatCurrency(detailSale.totalCost)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-surface-800/30 text-center">
                                <p className="text-xs text-surface-500">Profit</p>
                                <p className="text-sm font-semibold text-brand-400">{formatCurrency(detailSale.profitAmount)}</p>
                            </div>
                            <div className="p-3 rounded-lg bg-surface-800/30 text-center">
                                <p className="text-xs text-surface-500">Margin</p>
                                <p className="text-sm font-semibold">{formatPercent(detailSale.profitMargin)}</p>
                            </div>
                        </div>

                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-800/50">
                                    <th className="py-2 text-left text-xs font-medium text-surface-400">SKU</th>
                                    <th className="py-2 text-left text-xs font-medium text-surface-400">Product</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Qty</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Price</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Blended Cost</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Revenue</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Profit</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailSale.lineItems.map((li) => (
                                    <tr key={li.id} className="border-b border-surface-800/30">
                                        <td className="py-2 font-mono text-xs text-brand-400">{li.product.skuNumber}</td>
                                        <td className="py-2">{li.product.name}</td>
                                        <td className="py-2 text-right">{li.quantity}</td>
                                        <td className="py-2 text-right">{formatCurrency(li.unitPrice)}</td>
                                        <td className="py-2 text-right">{formatCurrency(li.blendedUnitCost)}</td>
                                        <td className="py-2 text-right text-success-500">{formatCurrency(li.lineRevenue)}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrency(li.lineProfit)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Modal>
        </PageShell>
    )
}
