import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatCurrency, formatDate } from '../../lib/formatters'
import type { QuoteData } from '@shared/types'

export default function QuotePrintTemplate() {
    const { id } = useParams()
    const [quote, setQuote] = useState<QuoteData | null>(null)
    const [error, setError] = useState('')

    useEffect(() => {
        async function load() {
            try {
                const res = await window.api.invoke(IPC_CHANNELS.QUOTE_GET, Number(id))
                if (res.success) {
                    setQuote(res.data as QuoteData)
                    // Tell main process we are done rendering
                    window.api.send('PRINT_READY', { success: true })
                } else {
                    setError('Failed to load quote')
                    window.api.send('PRINT_READY', { success: false })
                }
            } catch {
                setError('Error loading quote data')
                window.api.send('PRINT_READY', { success: false })
            }
        }
        load()
    }, [id])

    if (error) return <div className="p-10 text-red-500">{error}</div>
    if (!quote) return <div className="p-10">Loading template...</div>

    const client = quote.salesLead?.client

    // Layout matches "Quote Format.png" conceptually:
    // Header (Logo/Title)
    // Bill To / Quote Details
    // Table
    // Notes & Totals
    return (
        <div className="bg-white min-h-screen text-black w-full" style={{ width: '8.5in', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>
            <div className="p-12 pb-16">

                {/* Header */}
                <div className="flex justify-between items-start mb-12">
                    <div>
                        <h1 className="text-4xl font-bold tracking-tight text-slate-900 mb-1">COSTERRA</h1>
                        <div className="h-1 w-12 bg-blue-600 mb-2"></div>
                        <p className="text-sm text-slate-500 font-medium tracking-widest uppercase">Enterprise Resource Planning</p>
                    </div>
                    <div className="text-right">
                        <h2 className="text-3xl font-light text-slate-400 uppercase tracking-widest mb-2">Quote</h2>
                        <p className="text-sm font-semibold text-slate-800">#{quote.quoteNumber}</p>
                        <p className="text-xs text-slate-500 mt-1">Date: {formatDate(quote.createdAt)}</p>
                    </div>
                </div>

                <div className="h-px w-full bg-slate-200 mb-10"></div>

                {/* Info Blocks */}
                <div className="flex justify-between mb-12">
                    <div className="w-1/2 pr-8">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Prepared For</h3>
                        <div className="bg-slate-50 p-4 rounded-md border border-slate-100">
                            <p className="font-semibold text-slate-800">{client?.name} {client?.surname}</p>
                            {client?.address && <p className="text-sm text-slate-600 mt-1">{client.address}</p>}
                            {client?.city && (
                                <p className="text-sm text-slate-600">
                                    {client.city} {client?.zipCode && `, ${client.zipCode}`}
                                </p>
                            )}
                            {client?.phone && <p className="text-sm text-slate-600 mt-2">{client.phone}</p>}
                        </div>
                    </div>
                    <div className="w-1/2 pl-8 border-l border-slate-100">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Quote Details</h3>
                        <table className="w-full text-sm">
                            <tbody>
                                <tr>
                                    <td className="py-1 text-slate-500 font-medium w-32">Lead Reference:</td>
                                    <td className="py-1 text-slate-800">{quote.salesLead?.leadNumber}</td>
                                </tr>
                                <tr>
                                    <td className="py-1 text-slate-500 font-medium">Valid Until:</td>
                                    <td className="py-1 text-slate-800">30 days from date</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Table */}
                <table className="w-full text-sm mb-8 border-collapse">
                    <thead>
                        <tr>
                            <th className="bg-slate-800 text-white py-3 px-4 text-left font-semibold rounded-tl-md">Item</th>
                            <th className="bg-slate-800 text-white py-3 px-4 text-center font-semibold">Qty</th>
                            <th className="bg-slate-800 text-white py-3 px-4 text-right font-semibold">Unit Price</th>
                            <th className="bg-slate-800 text-white py-3 px-4 text-right font-semibold rounded-tr-md">Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        {quote.lineItems?.map((li: any, index: number) => (
                            <tr key={li.id} className={index % 2 === 0 ? 'bg-slate-50' : 'bg-white'}>
                                <td className="py-4 px-4 border-b border-slate-100">
                                    <div className="font-semibold text-slate-800">{li.product.name}</div>
                                    <div className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">{li.product.skuNumber}</div>
                                </td>
                                <td className="py-4 px-4 text-center border-b border-slate-100 text-slate-700">{li.quantity}</td>
                                <td className="py-4 px-4 text-right border-b border-slate-100 text-slate-700">{formatCurrency(li.unitPrice)}</td>
                                <td className="py-4 px-4 text-right font-medium text-slate-800 border-b border-slate-100">{formatCurrency(li.lineTotal)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Totals & Notes */}
                <div className="flex justify-between items-start">
                    <div className="w-1/2 pr-8">
                        {quote.notes && (
                            <div>
                                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Notes</h3>
                                <p className="text-sm text-slate-600 bg-slate-50 p-4 rounded-md border border-slate-100 whitespace-pre-wrap leading-relaxed">
                                    {quote.notes}
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="w-1/2 flex justify-end">
                        <div className="w-72">
                            <table className="w-full text-sm">
                                <tbody>
                                    <tr>
                                        <td className="py-2 text-slate-500 font-medium">Subtotal</td>
                                        <td className="py-2 text-right font-medium text-slate-800">
                                            {formatCurrency(quote.lineItems?.reduce((s, li) => s + li.lineTotal, 0) || 0)}
                                        </td>
                                    </tr>
                                    <tr className="border-b border-slate-200">
                                        <td className="py-2 text-slate-500 font-medium pb-4">Tax ({quote.taxRate}%)</td>
                                        <td className="py-2 text-right font-medium text-slate-800 pb-4">
                                            {formatCurrency(quote.taxAmount)}
                                        </td>
                                    </tr>
                                    <tr>
                                        <td className="py-4 text-base font-bold text-slate-800">Total Due</td>
                                        <td className="py-4 text-right text-lg font-bold text-blue-600">
                                            {formatCurrency((quote.lineItems?.reduce((s, li) => s + li.lineTotal, 0) || 0) + quote.taxAmount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                <div className="mt-20 pt-8 border-t border-slate-200 text-center">
                    <p className="text-xs text-slate-400 font-medium">Thank you for your business.</p>
                </div>
            </div>
        </div>
    )
}
