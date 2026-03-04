// ────────────────────────────────────────────────────────
// Costerra ERP — Quote Service
// Quote management with line items and pricing overrides.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { generateId } from '../utils/id-generator'
import type {
    QuoteData,
    QuoteCreateInput,
    QuoteLineItemInput,
    QuoteLineItemData,
    ListParams,
    PaginatedResult
} from '../../shared/types'

export async function listQuotes(params: ListParams = {}): Promise<PaginatedResult<QuoteData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (params.filters?.status) where.status = params.filters.status
    if (params.filters?.salesLeadId) where.salesLeadId = params.filters.salesLeadId

    if (params.search) {
        where.OR = [
            { quoteNumber: { contains: params.search } },
            { notes: { contains: params.search } }
        ]
    }

    const [items, total] = await Promise.all([
        prisma.quote.findMany({
            where,
            skip,
            take: pageSize,
            include: {
                salesLead: { include: { client: true } },
                lineItems: { include: { product: true } },
                sale: true
            },
            orderBy: { [params.sortBy || 'createdAt']: params.sortDir || 'desc' }
        }),
        prisma.quote.count({ where })
    ])

    return {
        items: items as unknown as QuoteData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function getQuote(id: number): Promise<QuoteData> {
    const prisma = getPrisma()
    const quote = await prisma.quote.findUnique({
        where: { id },
        include: {
            salesLead: { include: { client: true } },
            lineItems: { include: { product: true } },
            sale: true
        }
    })
    if (!quote) throw new Error(`Quote with ID ${id} not found`)
    return quote as unknown as QuoteData
}

/**
 * Creates a quote under a sales lead.
 * Quote can only be created from within a sales lead.
 */
export async function createQuote(input: QuoteCreateInput): Promise<QuoteData> {
    const prisma = getPrisma()
    const quoteNumber = await generateId('QUOTE')

    // Validate sales lead exists
    const lead = await prisma.salesLead.findUnique({ where: { id: input.salesLeadId } })
    if (!lead) throw new Error(`Sales Lead with ID ${input.salesLeadId} not found`)

    const quote = await prisma.quote.create({
        data: {
            quoteNumber,
            salesLeadId: input.salesLeadId,
            notes: input.notes || '',
            status: 'DRAFT'
        },
        include: {
            salesLead: { include: { client: true } },
            lineItems: { include: { product: true } },
            sale: true
        }
    })

    return quote as unknown as QuoteData
}

export async function updateQuote(id: number, data: { notes?: string; status?: string }): Promise<QuoteData> {
    const prisma = getPrisma()
    const existing = await prisma.quote.findUnique({ where: { id } })
    if (!existing) throw new Error(`Quote with ID ${id} not found`)

    const updateData: Record<string, unknown> = {}
    if (data.notes !== undefined) updateData.notes = data.notes
    if (data.status !== undefined) updateData.status = data.status

    const quote = await prisma.quote.update({
        where: { id },
        data: updateData,
        include: {
            salesLead: { include: { client: true } },
            lineItems: { include: { product: true } },
            sale: true
        }
    })

    return quote as unknown as QuoteData
}

/**
 * Adds a line item to a quote with optional pricing overrides.
 * Override prices do NOT modify the master product data.
 */
export async function addLineItem(input: QuoteLineItemInput): Promise<QuoteLineItemData> {
    const prisma = getPrisma()

    // Validate quote exists and is in DRAFT status
    const quote = await prisma.quote.findUnique({ where: { id: input.quoteId } })
    if (!quote) throw new Error(`Quote with ID ${input.quoteId} not found`)
    if (quote.status !== 'DRAFT') throw new Error('Cannot modify a quote that is not in DRAFT status')

    // Validate product exists and is active
    const product = await prisma.product.findUnique({ where: { id: input.productId } })
    if (!product) throw new Error(`Product with ID ${input.productId} not found`)
    if (!product.isActive) throw new Error(`Product "${product.name}" is inactive and cannot be quoted`)

    const lineTotal = input.quantity * input.unitPrice

    const lineItem = await prisma.quoteLineItem.create({
        data: {
            quoteId: input.quoteId,
            productId: input.productId,
            quantity: input.quantity,
            unitPrice: input.unitPrice,
            unitCost: input.unitCost,
            lineTotal: Math.round(lineTotal * 100) / 100
        },
        include: { product: true }
    })

    return lineItem as unknown as QuoteLineItemData
}

export async function removeLineItem(lineItemId: number): Promise<void> {
    const prisma = getPrisma()

    const item = await prisma.quoteLineItem.findUnique({
        where: { id: lineItemId },
        include: { quote: true }
    })

    if (!item) throw new Error(`Line item with ID ${lineItemId} not found`)
    if (item.quote.status !== 'DRAFT') throw new Error('Cannot modify a quote that is not in DRAFT status')

    await prisma.quoteLineItem.delete({ where: { id: lineItemId } })
}
