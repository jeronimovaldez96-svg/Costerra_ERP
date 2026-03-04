// ────────────────────────────────────────────────────────
// Costerra ERP — Suppliers Page (Full Implementation)
// DataTable listing with create/edit modal.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, Truck, Pencil } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatDate } from '../../lib/formatters'
import { Save } from 'lucide-react'

interface Supplier {
    id: number
    name: string
    contactName: string
    phone: string
    email: string
    createdAt: string
}

const columnHelper = createColumnHelper<Supplier>()

export default function SuppliersPage() {
    const [suppliers, setSuppliers] = useState<Supplier[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editSupplier, setEditSupplier] = useState<Supplier | null>(null)
    const { addToast } = useToastStore()

    const fetchSuppliers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.SUPPLIER_LIST, {})
            if (res.success) setSuppliers(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed', message: 'Could not load suppliers' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchSuppliers() }, [fetchSuppliers])

    const columns = useMemo(
        () => [
            columnHelper.accessor('name', {
                header: 'Company Name',
                cell: (info) => <span className="font-medium text-surface-100">{info.getValue()}</span>
            }),
            columnHelper.accessor('contactName', { header: 'Contact' }),
            columnHelper.accessor('phone', { header: 'Phone' }),
            columnHelper.accessor('email', {
                header: 'Email',
                cell: (info) => (
                    <span className="text-brand-400">{info.getValue()}</span>
                )
            }),
            columnHelper.accessor('createdAt', {
                header: 'Added',
                cell: (info) => formatDate(info.getValue())
            })
        ],
        []
    )

    return (
        <PageShell
            title="Suppliers"
            description="Manage vendor information and contacts"
            actions={
                <button className="btn-primary" onClick={() => { setEditSupplier(null); setFormOpen(true) }}>
                    <Plus size={16} /> Add Supplier
                </button>
            }
        >
            <DataTable
                data={suppliers}
                columns={columns}
                searchPlaceholder="Search suppliers..."
                exportFilename="suppliers"
                loading={loading}
                onRowClick={(s) => { setEditSupplier(s); setFormOpen(true) }}
                emptyIcon={<Truck size={24} className="text-surface-500" />}
                emptyTitle="No Suppliers Yet"
                emptyMessage="Add your first supplier to start creating purchase orders."
            />

            <Modal
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setEditSupplier(null) }}
                title={editSupplier ? `Edit — ${editSupplier.name}` : 'New Supplier'}
                size="md"
            >
                <SupplierForm
                    supplier={editSupplier}
                    onSuccess={() => { setFormOpen(false); setEditSupplier(null); fetchSuppliers() }}
                    onCancel={() => { setFormOpen(false); setEditSupplier(null) }}
                />
            </Modal>
        </PageShell>
    )
}

// ─── Inline Supplier Form ────────────────────────────

function SupplierForm({
    supplier,
    onSuccess,
    onCancel
}: {
    supplier: Supplier | null
    onSuccess: () => void
    onCancel: () => void
}) {
    const isEdit = !!supplier
    const { addToast } = useToastStore()
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: supplier?.name ?? '',
        contactName: supplier?.contactName ?? '',
        phone: supplier?.phone ?? '',
        email: supplier?.email ?? ''
    })

    const updateField = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim()) {
            addToast({ type: 'warning', title: 'Validation', message: 'Company name is required' })
            return
        }

        setSaving(true)
        try {
            const channel = isEdit ? IPC_CHANNELS.SUPPLIER_UPDATE : IPC_CHANNELS.SUPPLIER_CREATE
            const payload = isEdit ? { id: supplier!.id, ...form } : form
            const res = await window.api.invoke(channel, payload)

            if (res.success) {
                addToast({
                    type: 'success',
                    title: isEdit ? 'Supplier Updated' : 'Supplier Created',
                    message: res.data.name
                })
                onSuccess()
            } else {
                addToast({ type: 'error', title: 'Save Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Save Failed' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Company Name *</label>
                <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} className="input-base" placeholder="e.g. Global Materials Inc." />
            </div>
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Contact Name</label>
                <input type="text" value={form.contactName} onChange={(e) => updateField('contactName', e.target.value)} className="input-base" placeholder="e.g. Maria Fernandez" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">Phone</label>
                    <input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="input-base" placeholder="+1-555-0101" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">Email</label>
                    <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} className="input-base" placeholder="contact@example.com" />
                </div>
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/50">
                <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Supplier'}
                </button>
            </div>
        </form>
    )
}
