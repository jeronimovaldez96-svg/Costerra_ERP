// ────────────────────────────────────────────────────────
// Costerra ERP — Client Service
// CRUD with append-only ClientHistory and report generation.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { generateId } from '../utils/id-generator'
import type {
    ClientData,
    ClientCreateInput,
    ClientUpdateInput,
    ClientHistoryEntry,
    ListParams,
    PaginatedResult
} from '../../shared/types'

export async function listClients(params: ListParams = {}): Promise<PaginatedResult<ClientData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (params.search) {
        where.OR = [
            { name: { contains: params.search } },
            { surname: { contains: params.search } },
            { clientNumber: { contains: params.search } },
            { city: { contains: params.search } },
            { phone: { contains: params.search } }
        ]
    }

    const [items, total] = await Promise.all([
        prisma.client.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { [params.sortBy || 'createdAt']: params.sortDir || 'desc' }
        }),
        prisma.client.count({ where })
    ])

    return {
        items: items as unknown as ClientData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function getClient(id: number): Promise<ClientData & { salesLeads: unknown[] }> {
    const prisma = getPrisma()
    const client = await prisma.client.findUnique({
        where: { id },
        include: {
            salesLeads: {
                include: {
                    quotes: {
                        include: { sale: true }
                    }
                },
                orderBy: { createdAt: 'desc' }
            }
        }
    })
    if (!client) throw new Error(`Client with ID ${id} not found`)
    return client as unknown as ClientData & { salesLeads: unknown[] }
}

export async function createClient(input: ClientCreateInput): Promise<ClientData> {
    const prisma = getPrisma()
    const clientNumber = await generateId('CLIENT')

    const client = await prisma.client.create({
        data: {
            clientNumber,
            name: input.name,
            surname: input.surname,
            address: input.address || '',
            city: input.city || '',
            zipCode: input.zipCode || '',
            phone: input.phone || '',
            notes: input.notes || ''
        }
    })

    return client as unknown as ClientData
}

/**
 * Updates a client and records field-level changes in ClientHistory.
 * Mirrors the Product service append-only pattern.
 */
export async function updateClient(input: ClientUpdateInput): Promise<ClientData> {
    const prisma = getPrisma()
    const existing = await prisma.client.findUnique({ where: { id: input.id } })
    if (!existing) throw new Error(`Client with ID ${input.id} not found`)

    const historyEntries: Array<{ fieldName: string; oldValue: string; newValue: string }> = []
    const updateData: Record<string, unknown> = {}

    const fields: Array<keyof ClientUpdateInput> = [
        'name', 'surname', 'address', 'city', 'zipCode', 'phone', 'notes'
    ]

    for (const field of fields) {
        if (field === 'id') continue
        const newValue = input[field]
        if (newValue !== undefined) {
            const oldValue = existing[field as keyof typeof existing]
            if (String(newValue) !== String(oldValue)) {
                historyEntries.push({
                    fieldName: field,
                    oldValue: String(oldValue ?? ''),
                    newValue: String(newValue)
                })
                updateData[field] = newValue
            }
        }
    }

    if (Object.keys(updateData).length === 0) {
        return existing as unknown as ClientData
    }

    const [client] = await prisma.$transaction([
        prisma.client.update({ where: { id: input.id }, data: updateData }),
        ...historyEntries.map((entry) =>
            prisma.clientHistory.create({
                data: { clientId: input.id, ...entry }
            })
        )
    ])

    return client as unknown as ClientData
}

export async function getClientHistory(clientId: number): Promise<ClientHistoryEntry[]> {
    const prisma = getPrisma()
    const history = await prisma.clientHistory.findMany({
        where: { clientId },
        orderBy: { changedAt: 'desc' }
    })
    return history as unknown as ClientHistoryEntry[]
}

/**
 * Generates a client purchase report: all sales linked to this client
 * with dates, SKUs sold, units, revenue, and cost.
 */
export async function getClientReport(clientId: number): Promise<unknown> {
    const prisma = getPrisma()
    const client = await prisma.client.findUnique({
        where: { id: clientId },
        include: {
            salesLeads: {
                include: {
                    quotes: {
                        include: {
                            sale: {
                                include: {
                                    lineItems: {
                                        include: { product: true }
                                    }
                                }
                            },
                            lineItems: {
                                include: { product: true }
                            }
                        }
                    }
                }
            }
        }
    })

    if (!client) throw new Error(`Client with ID ${clientId} not found`)

    // Flatten sales data for the report
    const salesReport = client.salesLeads.flatMap((lead) =>
        lead.quotes
            .filter((quote) => quote.sale)
            .map((quote) => ({
                saleDate: quote.sale!.saleDate,
                saleNumber: quote.sale!.saleNumber,
                leadName: lead.name,
                totalRevenue: quote.sale!.totalRevenue,
                totalCost: quote.sale!.totalCost,
                profitAmount: quote.sale!.profitAmount,
                profitMargin: quote.sale!.profitMargin,
                lineItems: quote.sale!.lineItems.map((li) => ({
                    skuNumber: li.product.skuNumber,
                    productName: li.product.name,
                    quantity: li.quantity,
                    unitPrice: li.unitPrice,
                    lineRevenue: li.lineRevenue,
                    lineCost: li.lineCost
                }))
            }))
    )

    return {
        client: {
            clientNumber: client.clientNumber,
            name: client.name,
            surname: client.surname
        },
        totalSales: salesReport.length,
        totalRevenue: salesReport.reduce((sum, s) => sum + s.totalRevenue, 0),
        totalCost: salesReport.reduce((sum, s) => sum + s.totalCost, 0),
        sales: salesReport
    }
}
