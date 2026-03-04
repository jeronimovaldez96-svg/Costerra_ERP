// ────────────────────────────────────────────────────────
// Costerra ERP — Inventory Service
// FIFO batch management and stock level aggregation.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import type {
    InventoryBatchData,
    InventorySummary,
    ListParams,
    PaginatedResult
} from '../../shared/types'

/**
 * Lists all inventory batches with pagination.
 */
export async function listInventory(params: ListParams = {}): Promise<PaginatedResult<InventoryBatchData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    // Only show batches with remaining stock
    if (params.filters?.inStock) {
        where.remainingQty = { gt: 0 }
    }

    const [items, total] = await Promise.all([
        prisma.inventoryBatch.findMany({
            where,
            skip,
            take: pageSize,
            include: { product: true },
            orderBy: { receivedAt: 'asc' }
        }),
        prisma.inventoryBatch.count({ where })
    ])

    return {
        items: items as unknown as InventoryBatchData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

/**
 * Gets all batches for a specific product (FIFO order: oldest first).
 */
export async function getBatchesByProduct(productId: number): Promise<InventoryBatchData[]> {
    const prisma = getPrisma()
    const batches = await prisma.inventoryBatch.findMany({
        where: { productId },
        include: { product: true },
        orderBy: { receivedAt: 'asc' }
    })
    return batches as unknown as InventoryBatchData[]
}

/**
 * Calculates aggregated inventory summary per product.
 * Returns: total units, available units, reserved units, avg cost, total value.
 */
export async function getInventorySummary(): Promise<InventorySummary[]> {
    const prisma = getPrisma()

    // Get all products with their inventory batches
    const products = await prisma.product.findMany({
        where: { isActive: true },
        include: {
            inventoryBatches: {
                where: { remainingQty: { gt: 0 } },
                orderBy: { receivedAt: 'asc' }
            }
        }
    })

    const summaries: InventorySummary[] = products
        .map((product) => {
            const batches = product.inventoryBatches
            const totalUnits = batches.reduce((sum, b) => sum + b.remainingQty, 0)
            const reservedUnits = batches.reduce((sum, b) => sum + b.reservedQty, 0)
            const availableUnits = totalUnits - reservedUnits
            const totalStockValue = batches.reduce((sum, b) => sum + b.remainingQty * b.unitCost, 0)
            const avgUnitCost = totalUnits > 0 ? totalStockValue / totalUnits : 0

            return {
                productId: product.id,
                skuNumber: product.skuNumber,
                productName: product.name,
                productGroup: product.productGroup,
                productFamily: product.productFamily,
                color: product.color,
                totalUnits,
                availableUnits,
                reservedUnits,
                avgUnitCost: Math.round(avgUnitCost * 100) / 100,
                totalStockValue: Math.round(totalStockValue * 100) / 100
            }
        })
        .filter((s) => s.totalUnits > 0)

    return summaries
}
