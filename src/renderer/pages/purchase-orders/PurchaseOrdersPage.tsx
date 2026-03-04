// ────────────────────────────────────────────────────────
// Costerra ERP — Purchase Orders Page (Full Implementation)
// DataTable listing, PO creation with line items,
// and state machine status transitions.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, ClipboardList, ChevronRight } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import PurchaseOrderForm from './PurchaseOrderForm'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatDate } from '../../lib/formatters'
import { PO_TRANSITIONS } from '@shared/constants'
import type { PoStatus } from '@shared/constants'

interface PurchaseOrder {
    id: number
    poNumber: string
    supplier: { id: number; name: string }
    description: string
    status: PoStatus
    items: Array<{
        id: number
        product: { skuNumber: string; name: string }
        quantity: number
        unitCost: number
    }>
    createdAt: string
}

const STATUS_BADGES: Record<string, string> = {
    DRAFT: 'badge-neutral',
    IN_TRANSIT: 'badge-warning',
    DELIVERED: 'badge-success'
}

const NEXT_STATUS_LABEL: Record<string, string> = {
    DRAFT: 'Mark In Transit',
    IN_TRANSIT: 'Mark Delivered'
}

const columnHelper = createColumnHelper<PurchaseOrder>()

export default function PurchaseOrdersPage() {
    const [orders, setOrders] = useState<PurchaseOrder[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [detailOrder, setDetailOrder] = useState<PurchaseOrder | null>(null)
    const [statusTransition, setStatusTransition] = useState<{ po: PurchaseOrder; newStatus: PoStatus } | null>(null)
    const [transitioning, setTransitioning] = useState(false)
    const { addToast } = useToastStore()

    const fetchOrders = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.PO_LIST, {})
            if (res.success) setOrders(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchOrders() }, [fetchOrders])

    const handleStatusTransition = async () => {
        if (!statusTransition) return
        setTransitioning(true)
        try {
            const res = await window.api.invoke(
                IPC_CHANNELS.PO_UPDATE_STATUS,
                statusTransition.po.id,
                statusTransition.newStatus
            )
            if (res.success) {
                addToast({
                    type: 'success',
                    title: 'Status Updated',
                    message: `${res.data.poNumber} → ${statusTransition.newStatus}`
                })
                fetchOrders()
            } else {
                addToast({ type: 'error', title: 'Transition Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Transition Failed' })
        } finally {
            setTransitioning(false)
            setStatusTransition(null)
        }
    }

    const columns = useMemo(
        () => [
            columnHelper.accessor('poNumber', {
                header: 'PO #',
                cell: (info) => <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
            }),
            columnHelper.accessor((row) => row.supplier.name, {
                id: 'supplier',
                header: 'Supplier',
                cell: (info) => <span className="font-medium text-surface-100">{info.getValue()}</span>
            }),
            columnHelper.accessor('description', {
                header: 'Description',
                cell: (info) => <span className="text-surface-300 truncate max-w-[200px] block">{info.getValue()}</span>
            }),
            columnHelper.display({
                id: 'lineItems',
                header: 'Items',
                cell: ({ row }) => (
                    <span className="badge-neutral">{row.original.items.length} items</span>
                )
            }),
            columnHelper.display({
                id: 'totalCost',
                header: 'Total Cost',
                cell: ({ row }) => {
                    const total = row.original.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0)
                    return formatCurrency(total)
                }
            }),
            columnHelper.accessor('status', {
                header: 'Status',
                cell: (info) => (
                    <span className={STATUS_BADGES[info.getValue()] || 'badge-neutral'}>
                        {info.getValue().replace('_', ' ')}
                    </span>
                )
            }),
            columnHelper.accessor('createdAt', {
                header: 'Created',
                cell: (info) => formatDate(info.getValue())
            }),
            columnHelper.display({
                id: 'actions',
                header: '',
                cell: ({ row }) => {
                    const po = row.original
                    const transitions = PO_TRANSITIONS[po.status]
                    if (transitions.length === 0) return null
                    const nextStatus = transitions[0]
                    return (
                        <button
                            className="btn-ghost text-xs py-1"
                            onClick={(e) => {
                                e.stopPropagation()
                                setStatusTransition({ po, newStatus: nextStatus })
                            }}
                        >
                            {NEXT_STATUS_LABEL[po.status]}
                            <ChevronRight size={12} />
                        </button>
                    )
                }
            })
        ],
        []
    )

    return (
        <PageShell
            title="Purchase Orders"
            description="Create and track orders from your suppliers"
            actions={
                <button className="btn-primary" onClick={() => setFormOpen(true)}>
                    <Plus size={16} /> New Order
                </button>
            }
        >
            <DataTable
                data={orders}
                columns={columns}
                searchPlaceholder="Search by PO number, supplier..."
                exportFilename="purchase-orders"
                loading={loading}
                onRowClick={(po) => setDetailOrder(po)}
                emptyIcon={<ClipboardList size={24} className="text-surface-500" />}
                emptyTitle="No Purchase Orders Yet"
                emptyMessage="Create a purchase order to start tracking incoming inventory."
            />

            {/* ─── Create PO Modal ──────────────────────────── */}
            <Modal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                title="New Purchase Order"
                description="Select a supplier and add line items"
                size="xl"
            >
                <PurchaseOrderForm
                    onSuccess={() => { setFormOpen(false); fetchOrders() }}
                    onCancel={() => setFormOpen(false)}
                />
            </Modal>

            {/* ─── PO Detail Modal ──────────────────────────── */}
            <Modal
                isOpen={!!detailOrder}
                onClose={() => setDetailOrder(null)}
                title={`Purchase Order — ${detailOrder?.poNumber ?? ''}`}
                description={`Supplier: ${detailOrder?.supplier.name ?? ''}`}
                size="lg"
            >
                {detailOrder && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className={STATUS_BADGES[detailOrder.status] || 'badge-neutral'}>
                                {detailOrder.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-surface-500">{formatDate(detailOrder.createdAt)}</span>
                        </div>
                        {detailOrder.description && (
                            <p className="text-sm text-surface-300">{detailOrder.description}</p>
                        )}
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-800/50">
                                    <th className="py-2 text-left text-xs font-medium text-surface-400">SKU</th>
                                    <th className="py-2 text-left text-xs font-medium text-surface-400">Product</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Qty</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Unit Cost</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailOrder.items.map((item) => (
                                    <tr key={item.id} className="border-b border-surface-800/30">
                                        <td className="py-2 font-mono text-xs text-brand-400">{item.product.skuNumber}</td>
                                        <td className="py-2 text-surface-200">{item.product.name}</td>
                                        <td className="py-2 text-right">{item.quantity}</td>
                                        <td className="py-2 text-right">{formatCurrency(item.unitCost)}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrency(item.quantity * item.unitCost)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-surface-700/50">
                                    <td colSpan={4} className="py-3 text-right font-medium text-surface-300">Total:</td>
                                    <td className="py-3 text-right font-semibold text-surface-100">
                                        {formatCurrency(detailOrder.items.reduce((sum, i) => sum + i.quantity * i.unitCost, 0))}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Modal>

            {/* ─── Status Transition Confirmation ───────────── */}
            <ConfirmDialog
                isOpen={!!statusTransition}
                onClose={() => setStatusTransition(null)}
                onConfirm={handleStatusTransition}
                loading={transitioning}
                title="Confirm Status Change"
                message={
                    statusTransition?.newStatus === 'DELIVERED'
                        ? `Marking ${statusTransition.po.poNumber} as DELIVERED will create inventory batches for all ${statusTransition.po.items.length} line items. This action cannot be undone.`
                        : `Update ${statusTransition?.po.poNumber ?? ''} to ${statusTransition?.newStatus.replace('_', ' ') ?? ''}?`
                }
                confirmLabel={statusTransition?.newStatus === 'DELIVERED' ? 'Deliver & Create Inventory' : 'Confirm'}
                variant={statusTransition?.newStatus === 'DELIVERED' ? 'primary' : 'primary'}
            />
        </PageShell>
    )
}
