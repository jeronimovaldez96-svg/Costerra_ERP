// ────────────────────────────────────────────────────────
// Costerra ERP — Product Form
// Create and edit form for products. Handles image upload
// via the file manager IPC channel.
// ────────────────────────────────────────────────────────

import { useState } from 'react'
import { Save, ImagePlus, X } from 'lucide-react'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'

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
}

interface ProductFormProps {
    product: Product | null
    onSuccess: () => void
    onCancel: () => void
}

export default function ProductForm({ product, onSuccess, onCancel }: ProductFormProps) {
    const isEdit = !!product
    const { addToast } = useToastStore()
    const [saving, setSaving] = useState(false)

    const [form, setForm] = useState({
        name: product?.name ?? '',
        productGroup: product?.productGroup ?? '',
        productFamily: product?.productFamily ?? '',
        color: product?.color ?? '',
        defaultUnitCost: product?.defaultUnitCost ?? 0,
        defaultUnitPrice: product?.defaultUnitPrice ?? 0,
        imagePath: product?.imagePath ?? ''
    })

    const updateField = (field: string, value: string | number) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleImageUpload = async () => {
        try {
            const res = await window.api.invoke(IPC_CHANNELS.PRODUCT_UPLOAD_IMAGE)
            if (res.success && res.data) {
                updateField('imagePath', res.data)
                addToast({ type: 'success', title: 'Image Uploaded' })
            }
        } catch {
            addToast({ type: 'error', title: 'Upload Failed', message: 'Could not upload image' })
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        // Validation
        if (!form.name.trim()) {
            addToast({ type: 'warning', title: 'Validation', message: 'Product name is required' })
            return
        }
        if (form.defaultUnitCost <= 0) {
            addToast({ type: 'warning', title: 'Validation', message: 'Unit cost must be greater than zero' })
            return
        }
        if (form.defaultUnitPrice <= 0) {
            addToast({ type: 'warning', title: 'Validation', message: 'Unit price must be greater than zero' })
            return
        }

        setSaving(true)
        try {
            const channel = isEdit ? IPC_CHANNELS.PRODUCT_UPDATE : IPC_CHANNELS.PRODUCT_CREATE
            const payload = isEdit ? { id: product!.id, ...form } : form
            const res = await window.api.invoke(channel, payload)

            if (res.success) {
                addToast({
                    type: 'success',
                    title: isEdit ? 'Product Updated' : 'Product Created',
                    message: `${res.data.name} (${res.data.skuNumber})`
                })
                onSuccess()
            } else {
                addToast({ type: 'error', title: 'Save Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Save Failed', message: 'An unexpected error occurred' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            {/* ─── Product Name ─────────────────────────────── */}
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    Product Name *
                </label>
                <input
                    type="text"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                    className="input-base"
                    placeholder="e.g. Arctic White Porcelain Tile"
                />
            </div>

            {/* ─── Group / Family Row ───────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">
                        Product Group
                    </label>
                    <input
                        type="text"
                        value={form.productGroup}
                        onChange={(e) => updateField('productGroup', e.target.value)}
                        className="input-base"
                        placeholder="e.g. Tiles"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">
                        Product Family
                    </label>
                    <input
                        type="text"
                        value={form.productFamily}
                        onChange={(e) => updateField('productFamily', e.target.value)}
                        className="input-base"
                        placeholder="e.g. Porcelain"
                    />
                </div>
            </div>

            {/* ─── Color ────────────────────────────────────── */}
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    Color
                </label>
                <input
                    type="text"
                    value={form.color}
                    onChange={(e) => updateField('color', e.target.value)}
                    className="input-base"
                    placeholder="e.g. White"
                />
            </div>

            {/* ─── Pricing Row ──────────────────────────────── */}
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">
                        Default Unit Cost ($) *
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.defaultUnitCost}
                        onChange={(e) => updateField('defaultUnitCost', parseFloat(e.target.value) || 0)}
                        className="input-base"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">
                        Default Unit Price ($) *
                    </label>
                    <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={form.defaultUnitPrice}
                        onChange={(e) => updateField('defaultUnitPrice', parseFloat(e.target.value) || 0)}
                        className="input-base"
                    />
                </div>
            </div>

            {/* ─── Image ────────────────────────────────────── */}
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">
                    Product Image
                </label>
                <div className="flex items-center gap-3">
                    {form.imagePath ? (
                        <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-surface-700/50">
                            <img
                                src={`file://${form.imagePath}`}
                                alt="Product"
                                className="w-full h-full object-cover"
                            />
                            <button
                                type="button"
                                onClick={() => updateField('imagePath', '')}
                                className="absolute top-0.5 right-0.5 p-0.5 rounded bg-black/60 text-white hover:bg-black/80"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={handleImageUpload}
                            className="flex items-center gap-2 px-4 py-3 rounded-lg border border-dashed
                         border-surface-700/50 text-surface-400 hover:text-surface-200
                         hover:border-surface-600/50 transition-colors"
                        >
                            <ImagePlus size={18} />
                            <span className="text-sm">Upload Image</span>
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Actions ──────────────────────────────────── */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/50">
                <button type="button" onClick={onCancel} className="btn-ghost">
                    Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Product'}
                </button>
            </div>
        </form>
    )
}
