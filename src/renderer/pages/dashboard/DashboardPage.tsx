// ────────────────────────────────────────────────────────
// Costerra ERP — Dashboard Page (Full Implementation)
// Live analytics from the analytics service via IPC.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import { BarChart3, TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatPercent, formatNumber, formatDate } from '../../lib/formatters'

interface DashboardData {
    totalStockValue: number
    ytdRevenue: number
    ytdCost: number
    ytdProfit: number
    blendedProfitMargin: number
    totalSalesCount: number
    recentSales: Array<{
        saleNumber: string
        totalRevenue: number
        profitMargin: number
        saleDate: string
        quote: {
            salesLead: {
                client: { name: string; surname: string }
            }
        }
    }>
}

export default function DashboardPage() {
    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const { addToast } = useToastStore()

    const fetchDashboard = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.ANALYTICS_DASHBOARD)
            if (res.success) setData(res.data)
        } catch {
            addToast({ type: 'error', title: 'Dashboard Load Failed' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchDashboard() }, [fetchDashboard])

    return (
        <PageShell
            title="Dashboard"
            description="Overview of your business performance and key metrics"
        >
            {/* ─── Stats Grid ───────────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                    icon={<Package size={20} />}
                    label="Total Stock Value"
                    value={loading ? '—' : formatCurrency(data?.totalStockValue ?? 0)}
                    color="brand"
                />
                <StatCard
                    icon={<DollarSign size={20} />}
                    label="YTD Revenue"
                    value={loading ? '—' : formatCurrency(data?.ytdRevenue ?? 0)}
                    color="success"
                />
                <StatCard
                    icon={<TrendingUp size={20} />}
                    label="Profit Margin"
                    value={loading ? '—' : formatPercent(data?.blendedProfitMargin ?? 0)}
                    color="warning"
                />
                <StatCard
                    icon={<ShoppingCart size={20} />}
                    label="Total Sales"
                    value={loading ? '—' : formatNumber(data?.totalSalesCount ?? 0)}
                    color="brand"
                />
            </div>

            {/* ─── Financial Summary ────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Revenue vs Cost */}
                <div className="glass-card p-6">
                    <h3 className="text-sm font-medium text-surface-400 mb-4">Year-to-Date Financials</h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-300">Revenue</span>
                            <span className="text-lg font-semibold text-success-500">
                                {loading ? '—' : formatCurrency(data?.ytdRevenue ?? 0)}
                            </span>
                        </div>
                        <div className="w-full bg-surface-800/60 rounded-full h-2">
                            <div
                                className="bg-success-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: data && data.ytdRevenue > 0 ? '100%' : '0%' }}
                            />
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-surface-300">Cost of Goods</span>
                            <span className="text-lg font-semibold text-surface-200">
                                {loading ? '—' : formatCurrency(data?.ytdCost ?? 0)}
                            </span>
                        </div>
                        <div className="w-full bg-surface-800/60 rounded-full h-2">
                            <div
                                className="bg-danger-500/60 h-2 rounded-full transition-all duration-500"
                                style={{
                                    width: data && data.ytdRevenue > 0
                                        ? `${Math.round((data.ytdCost / data.ytdRevenue) * 100)}%`
                                        : '0%'
                                }}
                            />
                        </div>
                        <div className="flex items-center justify-between pt-2 border-t border-surface-800/50">
                            <span className="text-sm font-medium text-surface-200">Net Profit</span>
                            <span className="text-lg font-bold text-brand-400">
                                {loading ? '—' : formatCurrency(data?.ytdProfit ?? 0)}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Recent Sales */}
                <div className="glass-card p-6">
                    <h3 className="text-sm font-medium text-surface-400 mb-4">Recent Sales</h3>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="flex justify-between items-center">
                                    <div className="skeleton h-4 w-32" />
                                    <div className="skeleton h-4 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : data?.recentSales.length === 0 ? (
                        <div className="flex items-center justify-center py-8 text-sm text-surface-500">
                            No sales recorded yet
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {data?.recentSales.slice(0, 8).map((sale) => (
                                <div
                                    key={sale.saleNumber}
                                    className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-800/30 transition-colors"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="font-mono text-xs text-brand-400">{sale.saleNumber}</span>
                                        <span className="text-sm text-surface-300">
                                            {sale.quote.salesLead.client.name} {sale.quote.salesLead.client.surname}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-sm font-medium text-surface-100">
                                            {formatCurrency(sale.totalRevenue)}
                                        </span>
                                        <span className={`text-xs ${sale.profitMargin >= 20 ? 'text-success-500' : 'text-warning-500'}`}>
                                            {formatPercent(sale.profitMargin)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </PageShell>
    )
}

// ─── Stat Card Sub-Component ─────────────────────────

function StatCard({
    icon,
    label,
    value,
    color
}: {
    icon: React.ReactNode
    label: string
    value: string
    color: 'brand' | 'success' | 'warning' | 'danger'
}) {
    const colorMap = {
        brand: 'text-brand-400 bg-brand-500/10',
        success: 'text-success-500 bg-success-500/10',
        warning: 'text-warning-500 bg-warning-500/10',
        danger: 'text-danger-500 bg-danger-500/10'
    }

    return (
        <div className="stat-card">
            <div className="flex items-center gap-3 mb-3">
                <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
                <span className="text-sm text-surface-400">{label}</span>
            </div>
            <span className="text-2xl font-semibold text-surface-50">{value}</span>
        </div>
    )
}
