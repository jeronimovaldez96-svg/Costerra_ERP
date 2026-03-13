// ────────────────────────────────────────────────────────
// Costerra ERP — Purchase Order Create Form
// Multi-step: select supplier, add line items, submit.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useMemo } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency } from '../../lib/formatters'
import SearchableSelect from '../../components/ui/SearchableSelect'
import type { SearchableOption } from '../../components/ui/SearchableSelect'

interface Supplier {
    id: number
    name: string
}

interface Product {
    id: number
    skuNumber: string
    name: string
    defaultUnitCost: number
    isActive: boolean
}

interface LineItem {
    productId: number
    productName: string
    skuNumber: string
    quantity: number
    unitCost: number
}

interface PurchaseOrderFormProps {
    onSuccess: () => void
    onCancel: () => void
}

export default function PurchaseOrderForm({ onSuccess, onCancel }: PurchaseOrderFormProps) {
    const { addToast } = useToastStore()
    const [saving, setSaving] = useState(false)
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [products, setProducts] = useState<Product[]>([])

    const [supplierId, setSupplierId] = useState<number>(0)
    const [description, setDescription] = useState('')
    const [lineItems, setLineItems] = useState<LineItem[]>([])

    // Line item temporary fields
    const [selectedProductId, setSelectedProductId] = useState<number>(0)
    const [itemQty, setItemQty] = useState(1)
    const [itemCost, setItemCost] = useState(0)

    // Load suppliers and products
    useEffect(() => {
        async function load() {
            try {
                const [supRes, prodRes] = await Promise.all([
                    window.api.invoke(IPC_CHANNELS.SUPPLIER_LIST, { pageSize: 500 }),
                    window.api.invoke(IPC_CHANNELS.PRODUCT_LIST, { pageSize: 500, filters: { isActive: true } })
                ])
                if (supRes.success) setSuppliers(supRes.data.items)
                if (prodRes.success) setProducts(prodRes.data.items)
            } catch {
                addToast({ type: 'error', title: 'Load Failed' })
            }
        }
        load()
    }, [addToast])

    // ─── Searchable option lists ────────────────────────
    const supplierOptions = useMemo<SearchableOption[]>(
        () => suppliers.map((s) => ({ value: s.id, label: s.name })),
        [suppliers]
    )

    const productOptions = useMemo<SearchableOption[]>(
        () => products.map((p) => ({ value: p.id, label: `${p.skuNumber} — ${p.name}` })),
        [products]
    )

    // When product selection changes, pre-fill cost
    useEffect(() => {
        if (selectedProductId) {
            const product = products.find((p) => p.id === selectedProductId)
            if (product) setItemCost(product.defaultUnitCost)
        }
    }, [selectedProductId, products])

    const addLineItem = () => {
        if (!selectedProductId || itemQty <= 0 || itemCost <= 0) {
            addToast({ type: 'warning', title: 'Validation', message: 'Select a product and enter valid quantity and cost' })
            return
        }
        const product = products.find((p) => p.id === selectedProductId)
        if (!product) return

        // Prevent duplicate products
        if (lineItems.some((li) => li.productId === selectedProductId)) {
            addToast({ type: 'warning', title: 'Duplicate', message: 'This product is already in the order' })
            return
        }

        setLineItems((prev) => [
            ...prev,
            {
                productId: product.id,
                productName: product.name,
                skuNumber: product.skuNumber,
                quantity: itemQty,
                unitCost: itemCost
            }
        ])
        setSelectedProductId(0)
        setItemQty(1)
        setItemCost(0)
    }

    const removeLineItem = (productId: number) => {
        setLineItems((prev) => prev.filter((li) => li.productId !== productId))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!supplierId) {
            addToast({ type: 'warning', title: 'Validation', message: 'Select a supplier' })
            return
        }
        if (lineItems.length === 0) {
            addToast({ type: 'warning', title: 'Validation', message: 'Add at least one line item' })
            return
        }

        setSaving(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.PO_CREATE, {
                supplierId,
                description,
                items: lineItems.map((li) => ({
                    productId: li.productId,
                    quantity: li.quantity,
                    unitCost: li.unitCost
                }))
            })

            if (res.success) {
                addToast({ type: 'success', title: 'PO Created', message: res.data.poNumber })
                onSuccess()
            } else {
                addToast({ type: 'error', title: 'Create Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Create Failed' })
        } finally {
            setSaving(false)
        }
    }

    const totalCost = lineItems.reduce((sum, li) => sum + li.quantity * li.unitCost, 0)

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* ─── Supplier Selection ───────────────────────── */}
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Supplier *</label>
                <SearchableSelect
                    options={supplierOptions}
                    value={supplierId}
                    onChange={setSupplierId}
                    placeholder="Search suppliers..."
                />
            </div>

            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Description</label>
                <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="input-base"
                    placeholder="e.g. Q1 tile restock"
                />
            </div>

            {/* ─── Add Line Item ────────────────────────────── */}
            <div className="p-4 rounded-lg border border-surface-700/30 bg-surface-800/20 space-y-3">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Add Line Item</p>
                <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                        <label className="block text-xs text-surface-500 mb-1">Product</label>
                        <SearchableSelect
                            options={productOptions}
                            value={selectedProductId}
                            onChange={setSelectedProductId}
                            placeholder="Search products..."
                        />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-surface-500 mb-1">Quantity</label>
                        <input
                            type="number"
                            min="1"
                            value={itemQty}
                            onChange={(e) => setItemQty(parseInt(e.target.value) || 1)}
                            className="input-base text-sm"
                        />
                    </div>
                    <div className="col-span-3">
                        <label className="block text-xs text-surface-500 mb-1">Unit Cost ($)</label>
                        <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={itemCost}
                            onChange={(e) => setItemCost(parseFloat(e.target.value) || 0)}
                            className="input-base text-sm"
                        />
                    </div>
                    <div className="col-span-2">
                        <button type="button" onClick={addLineItem} className="btn-primary w-full text-sm py-2.5">
                            <Plus size={14} /> Add
                        </button>
                    </div>
                </div>
            </div>

            {/* ─── Line Items Table ─────────────────────────── */}
            {lineItems.length > 0 && (
                <div className="rounded-lg border border-surface-700/30 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-800/40">
                                <th className="px-3 py-2 text-left text-xs font-medium text-surface-400">SKU</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-surface-400">Product</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-surface-400">Qty</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-surface-400">Unit Cost</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-surface-400">Total</th>
                                <th className="px-3 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((li) => (
                                <tr key={li.productId} className="border-t border-surface-800/30">
                                    <td className="px-3 py-2 font-mono text-xs text-brand-400">{li.skuNumber}</td>
                                    <td className="px-3 py-2 text-surface-200">{li.productName}</td>
                                    <td className="px-3 py-2 text-right">{li.quantity}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(li.unitCost)}</td>
                                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(li.quantity * li.unitCost)}</td>
                                    <td className="px-3 py-2">
                                        <button
                                            type="button"
                                            onClick={() => removeLineItem(li.productId)}
                                            className="text-danger-500 hover:text-danger-400"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-surface-700/50 bg-surface-800/20">
                                <td colSpan={4} className="px-3 py-2.5 text-right font-medium text-surface-300">Order Total:</td>
                                <td className="px-3 py-2.5 text-right font-semibold text-surface-100">{formatCurrency(totalCost)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            {/* ─── Actions ──────────────────────────────────── */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/50">
                <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving || lineItems.length === 0}>
                    <Save size={16} />
                    {saving ? 'Creating...' : 'Create Purchase Order'}
                </button>
            </div>
        </form>
    )
}
