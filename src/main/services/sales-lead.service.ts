// ────────────────────────────────────────────────────────
// Costerra ERP — Sales Lead Service
// Lead lifecycle management with status transitions.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { generateId } from '../utils/id-generator'
import type {
    SalesLeadData,
    SalesLeadCreateInput,
    ListParams,
    PaginatedResult
} from '../../shared/types'
import type { LeadStatus } from '../../shared/constants'

export async function listLeads(params: ListParams = {}): Promise<PaginatedResult<SalesLeadData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (params.filters?.status) where.status = params.filters.status
    if (params.filters?.clientId) where.clientId = params.filters.clientId

    if (params.search) {
        where.OR = [
            { leadNumber: { contains: params.search } },
            { name: { contains: params.search } }
        ]
    }

    const [items, total] = await Promise.all([
        prisma.salesLead.findMany({
            where,
            skip,
            take: pageSize,
            include: { client: true, quotes: true },
            orderBy: { [params.sortBy || 'createdAt']: params.sortDir || 'desc' }
        }),
        prisma.salesLead.count({ where })
    ])

    return {
        items: items as unknown as SalesLeadData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function getLead(id: number): Promise<SalesLeadData> {
    const prisma = getPrisma()
    const lead = await prisma.salesLead.findUnique({
        where: { id },
        include: {
            client: true,
            quotes: {
                include: { lineItems: { include: { product: true } }, sale: true },
                orderBy: { createdAt: 'desc' }
            }
        }
    })
    if (!lead) throw new Error(`Sales Lead with ID ${id} not found`)
    return lead as unknown as SalesLeadData
}

export async function createLead(input: SalesLeadCreateInput): Promise<SalesLeadData> {
    const prisma = getPrisma()
    const leadNumber = await generateId('LEAD')

    // Validate client exists
    const client = await prisma.client.findUnique({ where: { id: input.clientId } })
    if (!client) throw new Error(`Client with ID ${input.clientId} not found`)

    const lead = await prisma.salesLead.create({
        data: {
            leadNumber,
            clientId: input.clientId,
            name: input.name,
            status: 'IN_PROGRESS'
        },
        include: { client: true, quotes: true }
    })

    return lead as unknown as SalesLeadData
}

/**
 * Updates lead status. Allows transitions: IN_PROGRESS ↔ SOLD, IN_PROGRESS ↔ NOT_SOLD.
 */
export async function updateLeadStatus(id: number, newStatus: LeadStatus): Promise<SalesLeadData> {
    const prisma = getPrisma()
    const lead = await prisma.salesLead.findUnique({ where: { id } })
    if (!lead) throw new Error(`Sales Lead with ID ${id} not found`)

    // When closing a lead, cascade all non-final quotes to NOT_SOLD
    if (newStatus === 'CLOSED') {
        await prisma.quote.updateMany({
            where: {
                salesLeadId: id,
                status: { in: ['DRAFT', 'SENT'] }
            },
            data: { status: 'NOT_SOLD' }
        })
    }

    const updated = await prisma.salesLead.update({
        where: { id },
        data: { status: newStatus },
        include: { client: true, quotes: true }
    })

    return updated as unknown as SalesLeadData
}
