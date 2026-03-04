// ────────────────────────────────────────────────────────
// Costerra ERP — Sales Leads Page (Full Implementation)
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, Target, Save } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatDate } from '../../lib/formatters'

interface SalesLead {
    id: number
    leadNumber: string
    name: string
    status: string
    client: { id: number; name: string; surname: string; clientNumber: string }
    quotes: Array<{ id: number; quoteNumber: string; status: string }>
    createdAt: string
}

interface Client {
    id: number
    clientNumber: string
    name: string
    surname: string
}

const STATUS_BADGES: Record<string, string> = {
    IN_PROGRESS: 'badge-warning',
    SOLD: 'badge-success',
    NOT_SOLD: 'badge-danger'
}

const columnHelper = createColumnHelper<SalesLead>()

export default function SalesLeadsPage() {
    const [leads, setLeads] = useState<SalesLead[]>([])
    const [loading, setLoading] = useState(true)
    const [formOpen, setFormOpen] = useState(false)
    const [detailLead, setDetailLead] = useState<SalesLead | null>(null)
    const { addToast } = useToastStore()

    const fetchLeads = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.LEAD_LIST, {})
            if (res.success) setLeads(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchLeads() }, [fetchLeads])

    const columns = useMemo(
        () => [
            columnHelper.accessor('leadNumber', {
                header: 'Lead #',
                cell: (info) => <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
            }),
            columnHelper.accessor('name', {
                header: 'Lead Name',
                cell: (info) => <span className="font-medium text-surface-100">{info.getValue()}</span>
            }),
            columnHelper.accessor((row) => `${row.client.name} ${row.client.surname}`, {
                id: 'client',
                header: 'Client'
            }),
            columnHelper.display({
                id: 'quotes',
                header: 'Quotes',
                cell: ({ row }) => <span className="badge-neutral">{row.original.quotes.length}</span>
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
            })
        ],
        []
    )

    return (
        <PageShell
            title="Sales Leads"
            description="Track sales opportunities and manage your pipeline"
            actions={
                <button className="btn-primary" onClick={() => setFormOpen(true)}>
                    <Plus size={16} /> New Lead
                </button>
            }
        >
            <DataTable
                data={leads}
                columns={columns}
                searchPlaceholder="Search leads..."
                exportFilename="sales-leads"
                loading={loading}
                onRowClick={(l) => setDetailLead(l)}
                emptyIcon={<Target size={24} className="text-surface-500" />}
                emptyTitle="No Sales Leads Yet"
                emptyMessage="Create a sales lead to start tracking opportunities."
            />

            {/* ─── Create Lead ──────────────────────────────── */}
            <Modal
                isOpen={formOpen}
                onClose={() => setFormOpen(false)}
                title="New Sales Lead"
                size="md"
            >
                <LeadForm
                    onSuccess={() => { setFormOpen(false); fetchLeads() }}
                    onCancel={() => setFormOpen(false)}
                />
            </Modal>

            {/* ─── Lead Detail ──────────────────────────────── */}
            <Modal
                isOpen={!!detailLead}
                onClose={() => setDetailLead(null)}
                title={`Lead — ${detailLead?.name ?? ''}`}
                description={`${detailLead?.leadNumber ?? ''} • Client: ${detailLead?.client.name ?? ''} ${detailLead?.client.surname ?? ''}`}
                size="lg"
            >
                {detailLead && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className={STATUS_BADGES[detailLead.status] || 'badge-neutral'}>
                                {detailLead.status.replace('_', ' ')}
                            </span>
                            <span className="text-xs text-surface-500">{formatDate(detailLead.createdAt)}</span>
                        </div>

                        <div>
                            <h4 className="text-sm font-medium text-surface-300 mb-2">Quotes</h4>
                            {detailLead.quotes.length === 0 ? (
                                <p className="text-xs text-surface-500">No quotes created for this lead yet.</p>
                            ) : (
                                <div className="space-y-1">
                                    {detailLead.quotes.map((q) => (
                                        <div key={q.id} className="flex items-center justify-between p-2 rounded-lg bg-surface-800/30">
                                            <span className="font-mono text-xs text-brand-400">{q.quoteNumber}</span>
                                            <span className={STATUS_BADGES[q.status] || 'badge-neutral'}>{q.status}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </Modal>
        </PageShell>
    )
}

// ─── Inline Lead Form ────────────────────────────────

function LeadForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
    const { addToast } = useToastStore()
    const [saving, setSaving] = useState(false)
    const [clients, setClients] = useState<Client[]>([])
    const [clientId, setClientId] = useState<number>(0)
    const [name, setName] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const res = await window.api.invoke(IPC_CHANNELS.CLIENT_LIST, { pageSize: 500 })
                if (res.success) setClients(res.data.items)
            } catch {
                addToast({ type: 'error', title: 'Load Failed' })
            }
        }
        load()
    }, [addToast])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!clientId) { addToast({ type: 'warning', title: 'Select a client' }); return }
        if (!name.trim()) { addToast({ type: 'warning', title: 'Enter a lead name' }); return }

        setSaving(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.LEAD_CREATE, { clientId, name })
            if (res.success) {
                addToast({ type: 'success', title: 'Lead Created', message: res.data.leadNumber })
                onSuccess()
            } else {
                addToast({ type: 'error', title: 'Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Failed' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Client *</label>
                <select value={clientId} onChange={(e) => setClientId(Number(e.target.value))} className="input-base">
                    <option value={0}>Select a client...</option>
                    {clients.map((c) => <option key={c.id} value={c.id}>{c.clientNumber} — {c.name} {c.surname}</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Lead Name *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input-base" placeholder="e.g. Kitchen Remodel — Mitchell" />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/50">
                <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} /> {saving ? 'Creating...' : 'Create Lead'}
                </button>
            </div>
        </form>
    )
}
