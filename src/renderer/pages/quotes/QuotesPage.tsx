// ────────────────────────────────────────────────────────
// Costerra ERP — Quotes Page (Full Implementation)
// DataTable listing, quote creation, line-item builder,
// and Convert-to-Sale action.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback, useMemo } from 'react'
import { createColumnHelper } from '@tanstack/react-table'
import { Plus, FileText, DollarSign, Trash2, Save, Printer } from 'lucide-react'
import PageShell from '../../components/layout/PageShell'
import DataTable from '../../components/data/DataTable'
import Modal from '../../components/ui/Modal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../stores/toast.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatDate } from '../../lib/formatters'

interface QuoteLineItem {
    id: number
    product: { id: number; skuNumber: string; name: string }
    quantity: number
    unitPrice: number
    unitCost: number
    lineTotal: number
}

interface Quote {
    id: number
    quoteNumber: string
    status: string
    notes: string
    taxRate: number
    taxAmount: number
    salesLead: {
        id: number
        leadNumber: string
        name: string
        client: { id: number; name: string; surname: string; clientNumber: string }
    }
    lineItems: QuoteLineItem[]
    sale: { id: number; saleNumber: string } | null
    createdAt: string
}

interface SalesLead {
    id: number
    leadNumber: string
    name: string
    status: string
    client: { name: string; surname: string }
}

const STATUS_BADGES: Record<string, string> = {
    DRAFT: 'badge-neutral',
    SENT: 'badge-brand',
    SOLD: 'badge-success',
    REJECTED: 'badge-danger',
    NOT_SOLD: 'badge-danger'
}

const columnHelper = createColumnHelper<Quote>()

export default function QuotesPage() {
    const [quotes, setQuotes] = useState<Quote[]>([])
    const [loading, setLoading] = useState(true)
    const [createOpen, setCreateOpen] = useState(false)
    const [detailQuote, setDetailQuote] = useState<Quote | null>(null)
    const [convertQuote, setConvertQuote] = useState<Quote | null>(null)
    const [converting, setConverting] = useState(false)
    const { addToast } = useToastStore()

    const fetchQuotes = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.QUOTE_LIST, {})
            if (res.success) setQuotes(res.data.items)
        } catch {
            addToast({ type: 'error', title: 'Load Failed' })
        } finally {
            setLoading(false)
        }
    }, [addToast])

    useEffect(() => { fetchQuotes() }, [fetchQuotes])

    // ─── Convert to Sale ───────────────────────────────
    const handleConvertToSale = async () => {
        if (!convertQuote) return
        setConverting(true)
        try {
            const verifiedCosts = convertQuote.lineItems.map((li) => ({
                productId: li.product.id,
                unitCost: li.unitCost
            }))
            const res = await window.api.invoke(IPC_CHANNELS.SALE_EXECUTE, {
                quoteId: convertQuote.id,
                verifiedCosts
            })
            if (res.success) {
                addToast({
                    type: 'success',
                    title: 'Sale Executed!',
                    message: `${res.data.saleNumber} — Revenue: ${formatCurrency(res.data.totalRevenue)}, Profit: ${formatCurrency(res.data.profitAmount)}`,
                    duration: 6000
                })
                fetchQuotes()
                setDetailQuote(null)
            } else {
                addToast({ type: 'error', title: 'Sale Failed', message: res.error, duration: 8000 })
            }
        } catch (err) {
            addToast({ type: 'error', title: 'Sale Failed', message: err instanceof Error ? err.message : 'Unknown error' })
        } finally {
            setConverting(false)
            setConvertQuote(null)
        }
    }

    const handlePrintPDF = async (quoteId: number) => {
        try {
            const res = await window.api.invoke(IPC_CHANNELS.QUOTE_PRINT_PDF, quoteId)
            if (res.success) {
                addToast({
                    type: 'success',
                    title: 'PDF Saved to Desktop',
                    message: res.data.fileName,
                    duration: 5000
                })
            } else {
                addToast({ type: 'error', title: 'Print Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Print Failed' })
        }
    }

    const columns = useMemo(
        () => [
            columnHelper.accessor('quoteNumber', {
                header: 'Quote #',
                cell: (info) => <span className="font-mono text-xs text-brand-400">{info.getValue()}</span>
            }),
            columnHelper.accessor((row) => row.salesLead.name, {
                id: 'lead',
                header: 'Sales Lead'
            }),
            columnHelper.accessor((row) => `${row.salesLead.client.name} ${row.salesLead.client.surname}`, {
                id: 'client',
                header: 'Client'
            }),
            columnHelper.display({
                id: 'items',
                header: 'Items',
                cell: ({ row }) => <span className="badge-neutral">{row.original.lineItems.length}</span>
            }),
            columnHelper.display({
                id: 'total',
                header: 'Total',
                cell: ({ row }) => {
                    const total = row.original.lineItems.reduce((sum, li) => sum + li.lineTotal, 0)
                    return <span className="font-medium">{formatCurrency(total)}</span>
                }
            }),
            columnHelper.accessor('status', {
                header: 'Status',
                cell: (info) => <span className={STATUS_BADGES[info.getValue()] || 'badge-neutral'}>{info.getValue()}</span>
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
            title="Quotes"
            description="Generate and manage client quotes with line-item pricing"
            actions={
                <button className="btn-primary" onClick={() => setCreateOpen(true)}>
                    <Plus size={16} /> New Quote
                </button>
            }
        >
            <DataTable
                data={quotes}
                columns={columns}
                searchPlaceholder="Search quotes..."
                exportFilename="quotes"
                loading={loading}
                onRowClick={(q) => setDetailQuote(q)}
                emptyIcon={<FileText size={24} className="text-surface-500" />}
                emptyTitle="No Quotes Yet"
                emptyMessage="Create a quote from a sales lead to start building proposals."
            />

            {/* ─── Create Quote Modal ───────────────────────── */}
            <Modal
                isOpen={createOpen}
                onClose={() => setCreateOpen(false)}
                title="New Quote"
                size="xl"
            >
                <QuoteCreateForm
                    onSuccess={() => { setCreateOpen(false); fetchQuotes() }}
                    onCancel={() => setCreateOpen(false)}
                />
            </Modal>

            {/* ─── Quote Detail Modal ───────────────────────── */}
            <Modal
                isOpen={!!detailQuote}
                onClose={() => setDetailQuote(null)}
                title={`Quote — ${detailQuote?.quoteNumber ?? ''}`}
                description={`
          Client: ${detailQuote?.salesLead.client.name ?? ''} ${detailQuote?.salesLead.client.surname ?? ''} •
          Lead: ${detailQuote?.salesLead.name ?? ''}
        `.trim()}
                size="lg"
                footer={
                    detailQuote?.status === 'DRAFT' && detailQuote.lineItems.length > 0 ? (
                        <>
                            <button className="btn-ghost" onClick={() => handlePrintPDF(detailQuote.id)}>
                                <Printer size={16} /> Print PDF
                            </button>
                            <button
                                className="btn-primary"
                                onClick={() => { setConvertQuote(detailQuote); }}
                            >
                                <DollarSign size={16} /> Convert to Sale
                            </button>
                        </>
                    ) : null
                }
            >
                {detailQuote && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            <span className={STATUS_BADGES[detailQuote.status] || 'badge-neutral'}>
                                {detailQuote.status}
                            </span>
                            {detailQuote.sale && (
                                <span className="badge-success">
                                    Sale: {detailQuote.sale.saleNumber}
                                </span>
                            )}
                        </div>

                        {detailQuote.notes && (
                            <p className="text-sm text-surface-300">{detailQuote.notes}</p>
                        )}

                        {/* Line Items Table */}
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-surface-800/50">
                                    <th className="py-2 text-left text-xs font-medium text-surface-400">SKU</th>
                                    <th className="py-2 text-left text-xs font-medium text-surface-400">Product</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Qty</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Unit Price</th>
                                    <th className="py-2 text-right text-xs font-medium text-surface-400">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detailQuote.lineItems.map((li) => (
                                    <tr key={li.id} className="border-b border-surface-800/30">
                                        <td className="py-2 font-mono text-xs text-brand-400">{li.product.skuNumber}</td>
                                        <td className="py-2 text-surface-200">{li.product.name}</td>
                                        <td className="py-2 text-right">{li.quantity}</td>
                                        <td className="py-2 text-right">{formatCurrency(li.unitPrice)}</td>
                                        <td className="py-2 text-right font-medium">{formatCurrency(li.lineTotal)}</td>
                                    </tr>
                                ))}
                            </tbody>
                            <tfoot>
                                <tr className="border-t border-surface-700/50">
                                    <td colSpan={4} className="pt-4 pb-1 text-right font-medium text-surface-400">Subtotal:</td>
                                    <td className="pt-4 pb-1 text-right text-surface-300">
                                        {formatCurrency(detailQuote.lineItems.reduce((sum, li) => sum + li.lineTotal, 0))}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="py-1 text-right font-medium text-surface-400">Tax ({detailQuote.taxRate}%):</td>
                                    <td className="py-1 text-right text-surface-300">
                                        {formatCurrency(detailQuote.taxAmount)}
                                    </td>
                                </tr>
                                <tr>
                                    <td colSpan={4} className="pt-1 pb-3 text-right font-bold text-surface-200">Quote Total:</td>
                                    <td className="pt-1 pb-3 text-right font-bold text-surface-100 border-t border-surface-800/30">
                                        {formatCurrency(detailQuote.lineItems.reduce((sum, li) => sum + li.lineTotal, 0) + detailQuote.taxAmount)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                )}
            </Modal>

            {/* ─── Convert to Sale Confirmation ─────────────── */}
            <ConfirmDialog
                isOpen={!!convertQuote}
                onClose={() => setConvertQuote(null)}
                onConfirm={handleConvertToSale}
                loading={converting}
                title="Execute Sale"
                message={
                    `This will execute an ACID sale transaction for quote ${convertQuote?.quoteNumber ?? ''}:\n\n` +
                    `• Verify stock availability for all ${convertQuote?.lineItems.length ?? 0} items\n` +
                    `• Deduct inventory using FIFO (oldest batches first)\n` +
                    `• Create the sale record with blended cost calculations\n` +
                    `• Mark the quote and lead as SOLD\n\n` +
                    `This action cannot be undone.`
                }
                confirmLabel="Execute Sale"
            />
        </PageShell>
    )
}

// ─── Quote Create Form ───────────────────────────────

function QuoteCreateForm({ onSuccess, onCancel }: { onSuccess: () => void; onCancel: () => void }) {
    const { addToast } = useToastStore()
    const [saving, setSaving] = useState(false)
    const [leads, setLeads] = useState<SalesLead[]>([])
    const [products, setProducts] = useState<Array<{ id: number; skuNumber: string; name: string; defaultUnitPrice: number; defaultUnitCost: number }>>([])

    const [salesLeadId, setSalesLeadId] = useState(0)
    const [notes, setNotes] = useState('')
    const [taxRate, setTaxRate] = useState(0)
    const [lineItems, setLineItems] = useState<Array<{ productId: number; skuNumber: string; name: string; quantity: number; unitPrice: number; unitCost: number }>>([])

    // Temp line item fields
    const [selProductId, setSelProductId] = useState(0)
    const [qty, setQty] = useState(1)
    const [price, setPrice] = useState(0)
    const [cost, setCost] = useState(0)

    useEffect(() => {
        async function load() {
            try {
                const [leadRes, prodRes] = await Promise.all([
                    window.api.invoke(IPC_CHANNELS.LEAD_LIST, { pageSize: 500, filters: { status: 'IN_PROGRESS' } }),
                    window.api.invoke(IPC_CHANNELS.PRODUCT_LIST, { pageSize: 500, filters: { isActive: true } })
                ])
                if (leadRes.success) setLeads(leadRes.data.items)
                if (prodRes.success) setProducts(prodRes.data.items)
            } catch {
                addToast({ type: 'error', title: 'Load Failed' })
            }
        }
        load()
    }, [addToast])

    useEffect(() => {
        if (selProductId) {
            const p = products.find((pr) => pr.id === selProductId)
            if (p) { setPrice(p.defaultUnitPrice); setCost(p.defaultUnitCost) }
        }
    }, [selProductId, products])

    const addItem = () => {
        if (!selProductId || qty <= 0) return
        const p = products.find((pr) => pr.id === selProductId)
        if (!p) return
        if (lineItems.some((li) => li.productId === selProductId)) {
            addToast({ type: 'warning', title: 'Duplicate product' }); return
        }
        setLineItems((prev) => [...prev, { productId: p.id, skuNumber: p.skuNumber, name: p.name, quantity: qty, unitPrice: price, unitCost: cost }])
        setSelProductId(0); setQty(1); setPrice(0); setCost(0)
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!salesLeadId) { addToast({ type: 'warning', title: 'Select a lead' }); return }
        if (lineItems.length === 0) { addToast({ type: 'warning', title: 'Add at least one line item' }); return }

        setSaving(true)
        try {
            // Create quote
            const quoteRes = await window.api.invoke(IPC_CHANNELS.QUOTE_CREATE, { salesLeadId, notes, taxRate })
            if (!quoteRes.success) { addToast({ type: 'error', title: 'Failed', message: quoteRes.error }); return }

            // Add line items
            for (const li of lineItems) {
                await window.api.invoke(IPC_CHANNELS.QUOTE_ADD_LINE_ITEM, {
                    quoteId: quoteRes.data.id,
                    productId: li.productId,
                    quantity: li.quantity,
                    unitPrice: li.unitPrice,
                    unitCost: li.unitCost
                })
            }

            addToast({ type: 'success', title: 'Quote Created', message: quoteRes.data.quoteNumber })
            onSuccess()
        } catch {
            addToast({ type: 'error', title: 'Failed' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-5">
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Sales Lead *</label>
                <select value={salesLeadId} onChange={(e) => setSalesLeadId(Number(e.target.value))} className="input-base">
                    <option value={0}>Select a lead...</option>
                    {leads.map((l) => <option key={l.id} value={l.id}>{l.leadNumber} — {l.name} ({l.client.name} {l.client.surname})</option>)}
                </select>
            </div>
            <div>
                <label className="block text-xs font-medium text-surface-400 mb-1.5">Notes</label>
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input-base min-h-[60px] resize-y" placeholder="Quote notes..." />
            </div>

            {/* Line Item Builder */}
            <div className="p-4 rounded-lg border border-surface-700/30 bg-surface-800/20 space-y-3">
                <p className="text-xs font-medium text-surface-400 uppercase tracking-wider">Line Items</p>
                <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-4">
                        <label className="block text-xs text-surface-500 mb-1">Product</label>
                        <select value={selProductId} onChange={(e) => setSelProductId(Number(e.target.value))} className="input-base text-sm">
                            <option value={0}>Select...</option>
                            {products.map((p) => <option key={p.id} value={p.id}>{p.skuNumber} — {p.name}</option>)}
                        </select>
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-surface-500 mb-1">Qty</label>
                        <input type="number" min="1" value={qty} onChange={(e) => setQty(parseInt(e.target.value) || 1)} className="input-base text-sm" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-surface-500 mb-1">Price ($)</label>
                        <input type="number" step="0.01" min="0" value={price} onChange={(e) => setPrice(parseFloat(e.target.value) || 0)} className="input-base text-sm" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-xs text-surface-500 mb-1">Cost ($)</label>
                        <input type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(parseFloat(e.target.value) || 0)} className="input-base text-sm" />
                    </div>
                    <div className="col-span-2">
                        <button type="button" onClick={addItem} className="btn-primary w-full text-sm py-2.5"><Plus size={14} /> Add</button>
                    </div>
                </div>
            </div>

            {lineItems.length > 0 && (
                <div className="rounded-lg border border-surface-700/30 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-surface-800/40">
                                <th className="px-3 py-2 text-left text-xs font-medium text-surface-400">SKU</th>
                                <th className="px-3 py-2 text-left text-xs font-medium text-surface-400">Product</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-surface-400">Qty</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-surface-400">Price</th>
                                <th className="px-3 py-2 text-right text-xs font-medium text-surface-400">Total</th>
                                <th className="px-3 py-2 w-10"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineItems.map((li) => (
                                <tr key={li.productId} className="border-t border-surface-800/30">
                                    <td className="px-3 py-2 font-mono text-xs text-brand-400">{li.skuNumber}</td>
                                    <td className="px-3 py-2">{li.name}</td>
                                    <td className="px-3 py-2 text-right">{li.quantity}</td>
                                    <td className="px-3 py-2 text-right">{formatCurrency(li.unitPrice)}</td>
                                    <td className="px-3 py-2 text-right font-medium">{formatCurrency(li.quantity * li.unitPrice)}</td>
                                    <td className="px-3 py-2">
                                        <button type="button" onClick={() => setLineItems((prev) => prev.filter((x) => x.productId !== li.productId))} className="text-danger-500 hover:text-danger-400">
                                            <Trash2 size={14} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="border-t border-surface-700/50 bg-surface-800/20">
                                <td colSpan={4} className="px-3 pt-4 pb-1 text-right font-medium text-surface-400">Subtotal:</td>
                                <td className="px-3 pt-4 pb-1 text-right text-surface-300">
                                    {formatCurrency(lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0))}
                                </td>
                                <td></td>
                            </tr>
                            <tr className="bg-surface-800/20">
                                <td colSpan={4} className="px-3 py-1 text-right font-medium text-surface-400">
                                    <div className="flex items-center justify-end gap-2">
                                        <label className="text-xs">Tax %</label>
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={taxRate}
                                            onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                                            className="input-base text-sm w-20 py-1"
                                        />
                                    </div>
                                </td>
                                <td className="px-3 py-1 text-right text-surface-300">
                                    {formatCurrency(lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0) * (taxRate / 100))}
                                </td>
                                <td></td>
                            </tr>
                            <tr className="bg-surface-800/20">
                                <td colSpan={4} className="px-3 pt-1 pb-4 text-right font-bold text-surface-200">Quote Total:</td>
                                <td className="px-3 pt-1 pb-4 text-right font-bold text-surface-100">
                                    {formatCurrency(lineItems.reduce((sum, li) => sum + li.quantity * li.unitPrice, 0) * (1 + (taxRate / 100)))}
                                </td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-surface-800/50">
                <button type="button" onClick={onCancel} className="btn-ghost">Cancel</button>
                <button type="submit" className="btn-primary" disabled={saving}>
                    <Save size={16} /> {saving ? 'Creating...' : 'Create Quote'}
                </button>
            </div>
        </form>
    )
}
