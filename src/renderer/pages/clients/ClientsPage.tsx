// ────────────────────────────────────────────────────────
// Costerra ERP — Clients Page (Full Implementation)
// DataTable listing with create/edit modal, client hub,
// and change history panel.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, Users, Save, History } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import ClientHistoryPanel from './ClientHistoryPanel'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatDate } from '../../lib/formatters'

interface Client {
    id: number
    clientNumber: string
    name: string
    surname: string
    address: string
    city: string
    zipCode: string
    phone: string
    notes: string
    createdAt: string
}

const columnHelper = createColumnHelper<Client>()

export default function ClientsPage() {
    const [clients, setClients] = useState<Client[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [editClient, setEditClient] = useState<Client | null>(null)
    const [historyClient, setHistoryClient] = useState<Client | null>(null)
    const { addToast } = useToastStore()

    const fetchClients = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.CLIENT_LIST, {})
            if (res.success) setClients(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed', message: 'Could not load clients' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchClients() }, [fetchClients])

    const columns = useMemo(
        () => [
            columnHelper.accessor('clientNumber', {
                header: 'Client #',
                cell: (info) => <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
            }),
            columnHelper.display({
                id: 'fullName',
                header: 'Name',
                cell: ({ row }) => (
                    <span className="font-medium text-surface-100">
                        {row.original.name} {row.original.surname}
                    </span>
                )
            }),
            columnHelper.accessor('city', { header: 'City' }),
            columnHelper.accessor('phone', { header: 'Phone' }),
            columnHelper.accessor('createdAt', {
                header: 'Added',
                cell: (info) => formatDate(info.getValue())
            }),
            columnHelper.display({
                id: 'actions',
                header: '',
                cell: ({ row }) => (
                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => setHistoryClient(row.original)}
                            className="btn-ghost p-1.5"
                            title="View History"
                        >
                            <History size={14} />
                        </button>
                    </div>
                )
            })
        ],
        []
    )

    return (
        <PageShell
            title="Clients"
            description="Manage client profiles, relationship history, and sales contacts"
            actions={
                <button className="btn-primary" onClick={() => { setEditClient(null); setFormOpen(true) }}>
                    <Plus size={16} /> Add Client
                </button>
            }
        >
            <DataTable
                data={clients}
                columns={columns}
                searchPlaceholder="Search clients by name, number, city..."
                exportFilename="clients"
                loading={loading}
                onRowClick={(c) => { setEditClient(c); setFormOpen(true) }}
                emptyIcon={<Users size={24} className="text-surface-500" />}
                emptyTitle="No Clients Yet"
                emptyMessage="Add your first client to start tracking relationships."
            />

            <Modal
                isOpen={formOpen}
                onClose={() => { setFormOpen(false); setEditClient(null) }}
                title={editClient ? `Edit — ${editClient.name} ${editClient.surname}` : 'New Client'}
                description={editClient ? `Client #: ${editClient.clientNumber}` : 'Create a new client with auto-generated number'}
                size="lg"
            >
                <ClientForm
                    client={editClient}
                    onSuccess={() => { setFormOpen(false); setEditClient(null); fetchClients() }}
                    onCancel={() => { setFormOpen(false); setEditClient(null) }}
                />
            </Modal>

            {/* ─── History Panel ─────────────────────────────── */}
            <Modal
                isOpen={!!historyClient}
                onClose={() => setHistoryClient(null)}
                title={`History — ${historyClient?.name ?? ''} ${historyClient?.surname ?? ''}`}
                description={`Change log for ${historyClient?.clientNumber ?? ''}`}
                size="lg"
            >
                {historyClient && <ClientHistoryPanel clientId={historyClient.id} />}
            </Modal>
        </PageShell>
    )
}

// ─── Inline Client Form ──────────────────────────────

function ClientForm({
    client,
    onSuccess,
    onCancel
}: {
    client: Client | null
    onSuccess: () => void
    onCancel: () => void
}) {
    const isEdit = !!client
    const { addToast } = useToastStore()
    const [saving, setSaving] = useState(false)
    const [form, setForm] = useState({
        name: client?.name ?? '',
        surname: client?.surname ?? '',
        address: client?.address ?? '',
        city: client?.city ?? '',
        zipCode: client?.zipCode ?? '',
        phone: client?.phone ?? '',
        notes: client?.notes ?? ''
    })

    const updateField = (field: string, value: string) =>
        setForm((prev) => ({ ...prev, [field]: value }))

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.name.trim() || !form.surname.trim()) {
            addToast({ type: 'warning', title: 'Validation', message: 'First name and surname are required' })
            return
        }

        setSaving(true)
        try {
            const channel = isEdit ? IPC_CHANNELS.CLIENT_UPDATE : IPC_CHANNELS.CLIENT_CREATE
            const payload = isEdit ? { id: client!.id, ...form } : form
            const res = await window.api.invoke(channel, payload)

            if (res.success) {
                addToast({
                    type: 'success',
                    title: isEdit ? 'Client Updated' : 'Client Created',
                    message: `${res.data.name} ${res.data.surname} (${res.data.clientNumber})`
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
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">First Name *</label>
                    <input type="text" value={form.name} onChange={(e) => updateField('name', e.target.value)} className="input-base" placeholder="e.g. Sarah" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">Surname *</label>
                    <input type="text" value={form.surname} onChange={(e) => updateField('surname', e.target.value)} className="input-base" placeholder="e.g. Mitchell" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Address</label>
                <input type="text" value={form.address} onChange={(e) => updateField('address', e.target.value)} className="input-base" placeholder="742 Evergreen Terrace" />
            </div>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">City</label>
                    <input type="text" value={form.city} onChange={(e) => updateField('city', e.target.value)} className="input-base" placeholder="Springfield" />
                </div>
                <div>
                    <label className="block text-xs font-medium text-surface-400 mb-1.5">Zip Code</label>
                    <input type="text" value={form.zipCode} onChange={(e) => updateField('zipCode', e.target.value)} className="input-base" placeholder="62704" />
                </div>
            </div>
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Phone</label>
                <input type="text" value={form.phone} onChange={(e) => updateField('phone', e.target.value)} className="input-base" placeholder="+1-555-0301" />
            </div>
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Notes</label>
                <textarea value={form.notes} onChange={(e) => updateField('notes', e.target.value)} className="input-base min-h-[80px] resize-y" placeholder="Additional notes about this client..." />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/50">
                <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} />
                    {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}
                </button>
            </div>
        </form>
    )
}
