// ────────────────────────────────────────────────────────
// Costerra ERP — Auto-ID Generator
// Generates sequential, prefixed IDs for all entities.
// Pattern: PREFIX-00001, PREFIX-00002, etc.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { ID_PREFIXES } from '../../shared/constants'

type EntityType = keyof typeof ID_PREFIXES

/**
 * Generates the next sequential ID for a given entity type.
 *
 * @param entity - The entity type (SKU, PO, CLIENT, LEAD, QUOTE, SALE)
 * @returns A formatted ID string like "SKU-00001"
 *
 * @example
 * const sku = await generateId('SKU')   // "SKU-00001"
 * const po  = await generateId('PO')    // "PO-00001"
 */
export async function generateId(entity: EntityType): Promise<string> {
    const prefix = ID_PREFIXES[entity]
    const prisma = getPrisma()

    // Map entity type to the corresponding Prisma model and field
    const countMap: Record<EntityType, () => Promise<number>> = {
        SKU: () => prisma.product.count(),
        PO: () => prisma.purchaseOrder.count(),
        CLIENT: () => prisma.client.count(),
        LEAD: () => prisma.salesLead.count(),
        QUOTE: () => prisma.quote.count(),
        SALE: () => prisma.sale.count()
    }

    const count = await countMap[entity]()
    const nextNumber = count + 1
    const padded = String(nextNumber).padStart(5, '0')

    return `${prefix}-${padded}`
}
