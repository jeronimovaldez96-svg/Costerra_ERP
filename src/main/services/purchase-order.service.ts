// ────────────────────────────────────────────────────────
// Costerra ERP — Purchase Order Service
// Manages PO lifecycle with state machine transitions.
// On DELIVERED, creates InventoryBatch entries atomically.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { generateId } from '../utils/id-generator'
import { PO_TRANSITIONS } from '../../shared/constants'
import type {
    PurchaseOrderData,
    PurchaseOrderCreateInput,
    ListParams,
    PaginatedResult
} from '../../shared/types'
import type { PoStatus } from '../../shared/constants'

export async function listPurchaseOrders(params: ListParams = {}): Promise<PaginatedResult<PurchaseOrderData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (params.filters?.status) {
        where.status = params.filters.status
    }

    if (params.search) {
        where.OR = [
            { poNumber: { contains: params.search } },
            { description: { contains: params.search } }
        ]
    }

    const [items, total] = await Promise.all([
        prisma.purchaseOrder.findMany({
            where,
            skip,
            take: pageSize,
            include: { supplier: true, items: { include: { product: true } } },
            orderBy: { [params.sortBy || 'createdAt']: params.sortDir || 'desc' }
        }),
        prisma.purchaseOrder.count({ where })
    ])

    return {
        items: items as unknown as PurchaseOrderData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function getPurchaseOrder(id: number): Promise<PurchaseOrderData> {
    const prisma = getPrisma()
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { supplier: true, items: { include: { product: true } } }
    })
    if (!po) throw new Error(`Purchase Order with ID ${id} not found`)
    return po as unknown as PurchaseOrderData
}

/**
 * Creates a PO with line items in a single transaction.
 */
export async function createPurchaseOrder(input: PurchaseOrderCreateInput): Promise<PurchaseOrderData> {
    const prisma = getPrisma()
    const poNumber = await generateId('PO')

    // Validate supplier exists
    const supplier = await prisma.supplier.findUnique({ where: { id: input.supplierId } })
    if (!supplier) throw new Error(`Supplier with ID ${input.supplierId} not found`)

    // Validate all products exist
    for (const item of input.items) {
        const product = await prisma.product.findUnique({ where: { id: item.productId } })
        if (!product) throw new Error(`Product with ID ${item.productId} not found`)
    }

    const po = await prisma.purchaseOrder.create({
        data: {
            poNumber,
            supplierId: input.supplierId,
            description: input.description || '',
            status: 'DRAFT',
            items: {
                create: input.items.map((item) => ({
                    productId: item.productId,
                    quantity: item.quantity,
                    unitCost: item.unitCost
                }))
            }
        },
        include: { supplier: true, items: { include: { product: true } } }
    })

    return po as unknown as PurchaseOrderData
}

/**
 * Transitions PO status following the state machine.
 * On DELIVERED, creates InventoryBatch entries for each line item.
 */
export async function updatePurchaseOrderStatus(id: number, newStatus: PoStatus): Promise<PurchaseOrderData> {
    const prisma = getPrisma()
    const po = await prisma.purchaseOrder.findUnique({
        where: { id },
        include: { items: true }
    })

    if (!po) throw new Error(`Purchase Order with ID ${id} not found`)

    // Enforce state machine transitions
    const currentStatus = po.status as PoStatus
    const allowedTransitions = PO_TRANSITIONS[currentStatus]

    if (!allowedTransitions.includes(newStatus)) {
        throw new Error(
            `Invalid status transition: ${currentStatus} → ${newStatus}. ` +
            `Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
        )
    }

    // If transitioning to DELIVERED, create inventory batches atomically
    if (newStatus === 'DELIVERED') {
        const result = await prisma.$transaction(async (tx) => {
            // Update PO status
            const updatedPo = await tx.purchaseOrder.update({
                where: { id },
                data: { status: newStatus },
                include: { supplier: true, items: { include: { product: true } } }
            })

            // Create inventory batches for each line item
            for (const item of po.items) {
                await tx.inventoryBatch.create({
                    data: {
                        productId: item.productId,
                        purchaseOrderItemId: item.id,
                        initialQty: item.quantity,
                        remainingQty: item.quantity,
                        reservedQty: 0,
                        unitCost: item.unitCost
                    }
                })
            }

            return updatedPo
        })

        return result as unknown as PurchaseOrderData
    }

    // Non-DELIVERED transitions — simple status update
    const updated = await prisma.purchaseOrder.update({
        where: { id },
        data: { status: newStatus },
        include: { supplier: true, items: { include: { product: true } } }
    })

    return updated as unknown as PurchaseOrderData
}
