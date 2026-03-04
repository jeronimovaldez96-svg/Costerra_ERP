// ────────────────────────────────────────────────────────
// Costerra ERP — Products Page (Full Implementation)
// DataTable listing with create/edit modal, image upload,
// toggle active, and history panel.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, Eye, EyeOff, History, Package } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import ProductForm from './ProductForm'
import ProductHistoryPanel from './ProductHistoryPanel'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatDate } from '../../lib/formatters'

interface Product {
    id: number
    skuNumber: string
    productGroup: string
    productFamily: string
    name: string
    color: string
    imagePath: string | null
    defaultUnitCost: number
    defaultUnitPrice: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

const columnHelper = createColumnHelper<Product>()

export default function ProductsPage() {
    const [products, setProducts] = useState<Product[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<Product | null>(null)
    const [historyProduct, setHistoryProduct] = useState<Product | null>(null)
    const [toggleConfirm, setToggleConfirm] = useState<Product | null>(null)
    const { addToast } = useToastStore()

    // ─── Fetch Products ────────────────────────────────
    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.PRODUCT_LIST, {})
            if (res.success) setProducts(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed', message: 'Could not load products' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    // ─── Toggle Active ─────────────────────────────────
    const handleToggleActive = async () => {
        if (!toggleConfirm) return
        try {
            const res = await window.api.invoke(IPC_CHANNELS.PRODUCT_TOGGLE_ACTIVE, toggleConfirm.id)
            if (res.success) {
                addToast({
                    type: 'success',
                    title: res.data.isActive ? 'Product Reactivated' : 'Product Deactivated',
                    message: `${res.data.name} (${res.data.skuNumber})`
                })
                fetchProducts()
            }
        } catch {
            addToast({ type: 'error', title: 'Action Failed', message: 'Could not update product status' })
        } finally {
            setToggleConfirm(null)
        }
    }

    // ─── Columns ───────────────────────────────────────
    const columns = useMemo(
        () => [
            columnHelper.accessor('skuNumber', {
                header: 'SKU',
                cell: (info) => (
                    <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
                )
            }),
            columnHelper.accessor('name', {
                header: 'Product Name',
                cell: (info) => (
                    <span className="font-medium text-surface-100">{info.getValue()}</span>
                )
            }),
            columnHelper.accessor('productGroup', {
                header: 'Group'
            }),
            columnHelper.accessor('productFamily', {
                header: 'Family'
            }),
            columnHelper.accessor('color', {
                header: 'Color',
                cell: (info) => (
                    <span className="badge-neutral">{info.getValue()}</span>
                )
            }),
            columnHelper.accessor('defaultUnitCost', {
                header: 'Unit Cost',
                cell: (info) => formatCurrency(info.getValue())
            }),
            columnHelper.accessor('defaultUnitPrice', {
                header: 'Unit Price',
                cell: (info) => (
                    <span className="font-medium text-success-500">{formatCurrency(info.getValue())}</span>
                )
            }),
            columnHelper.accessor('isActive', {
                header: 'Status',
                cell: (info) =>
                    info.getValue() ? (
                        <span className="badge-success">Active</span>
                    ) : (
                        <span className="badge-danger">Inactive</span>
                    )
            }),
            columnHelper.display({
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setHistoryProduct(row.original)}
                            className="btn-ghost p-1.5"
                            title="View History"
                        >
                            <History size={14} />
                        </button>
                        <button
                            onClick={() => setToggleConfirm(row.original)}
                            className="btn-ghost p-1.5"
                            title={row.original.isActive ? 'Deactivate' : 'Reactivate'}
                        >
                            {row.original.isActive ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                    </div>
                )
            })
        ],
        []
    )

    return (
        <PageShell
            title="Products"
            description="Manage your product catalog, SKUs, and pricing"
            actions={
                <button className="btn-primary" onClick={() => { setEditProduct(null); setFormOpen(true) }}>
                    <Plus size={16} />
                    Add Product
                </button>
            }
        >
            <DataTable
                data={products}
                columns={columns}
                searchPlaceholder="Search products by name, SKU, group..."
                exportFilename="products"
                loading={loading}
                onRowClick={(p) => { setEditProduct(p); setFormOpen(true) }}
                emptyIcon={<Package size={24} className="text-surface-500" />}
                emptyTitle="No Products Yet"
                emptyMessage="Create your first product to start building your catalog."
            />

            {/* ─── Create / Edit Modal ──────────────────────── */}
            <Modal
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setEditProduct(null) }}
                title={editProduct ? `Edit — ${editProduct.name}` : 'New Product'}
                description={editProduct ? `SKU: ${editProduct.skuNumber}` : 'Create a new product with auto-generated SKU'}
                size="lg"
            >
                <ProductForm
                    product={editProduct}
                    onSuccess={() => { setFormOpen(false); setEditProduct(null); fetchProducts() }}
                    onCancel={() => { setFormOpen(false); setEditProduct(null) }}
                />
            </Modal>

            {/* ─── History Side Panel ───────────────────────── */}
            <Modal
                isOpen={!!historyProduct}
                onClose={() => setHistoryProduct(null)}
                title={`History — ${historyProduct?.name ?? ''}`}
                description={`Change log for ${historyProduct?.skuNumber ?? ''}`}
                size="lg"
            >
                {historyProduct && <ProductHistoryPanel productId={historyProduct.id} />}
            </Modal>

            {/* ─── Toggle Active Confirmation ───────────────── */}
            <ConfirmDialog
                isOpen={!!toggleConfirm}
                onClose={() => setToggleConfirm(null)}
                onConfirm={handleToggleActive}
                title={toggleConfirm?.isActive ? 'Deactivate Product' : 'Reactivate Product'}
                message={
                    toggleConfirm?.isActive
                        ? `Deactivating "${toggleConfirm.name}" will prevent it from appearing in new quotes and purchase orders.`
                        : `Reactivating "${toggleConfirm?.name}" will make it available again for quotes and orders.`
                }
                confirmLabel={toggleConfirm?.isActive ? 'Deactivate' : 'Reactivate'}
                variant={toggleConfirm?.isActive ? 'danger' : 'primary'}
            />
        </PageShell>
    )
}
