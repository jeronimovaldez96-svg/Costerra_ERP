// ────────────────────────────────────────────────────────
// Costerra ERP — Sale Execution Service
// THE MOST CRITICAL SERVICE IN THE SYSTEM.
//
// Implements the ACID sale transaction:
// 1. Pre-flight stock verification (early return on failure)
// 2. FIFO batch iteration — oldest batches first
// 3. Blended unit cost calculation
// 4. Atomic $transaction: Sale + SaleLineItem creation,
//    InventoryBatch deduction, Quote status update
// 5. Full rollback on any step failure
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { generateId } from '../utils/id-generator'
import type {
    SaleData,
    SaleExecuteInput,
    ListParams,
    PaginatedResult
} from '../../shared/types'

/**
 * Executes a sale from a given quote.
 *
 * This is a strict, atomic database transaction that:
 * 1. Validates stock availability for every line item
 * 2. Iterates through FIFO batches (oldest first) to deduct stock
 * 3. Calculates the mathematically pure blended unit cost
 * 4. Creates Sale + SaleLineItem records
 * 5. Marks Quote as SOLD and Lead as SOLD
 * 6. Rolls back entirely if any step fails
 */
export async function executeSale(input: SaleExecuteInput): Promise<SaleData> {
    const prisma = getPrisma()

    // ─── Step 0: Fetch quote with all related data ─────
    const quote = await prisma.quote.findUnique({
        where: { id: input.quoteId },
        include: {
            lineItems: { include: { product: true } },
            salesLead: true,
            sale: true
        }
    })

    if (!quote) throw new Error(`Quote with ID ${input.quoteId} not found`)
    if (quote.sale) throw new Error(`Quote ${quote.quoteNumber} has already been converted to a sale`)
    if (quote.lineItems.length === 0) throw new Error('Cannot execute a sale with no line items')

    // ─── Step 1: Pre-flight stock verification ─────────
    // Early return pattern: fail fast before entering the transaction
    for (const lineItem of quote.lineItems) {
        const availableStock = await prisma.inventoryBatch.aggregate({
            where: {
                productId: lineItem.productId,
                remainingQty: { gt: 0 }
            },
            _sum: { remainingQty: true }
        })

        const available = availableStock._sum.remainingQty || 0

        if (available < lineItem.quantity) {
            throw new Error(
                `Insufficient stock for "${lineItem.product.name}" (${lineItem.product.skuNumber}). ` +
                `Requested: ${lineItem.quantity}, Available: ${available}`
            )
        }
    }

    // ─── Step 2-5: Atomic Transaction ──────────────────
    const saleNumber = await generateId('SALE')

    const result = await prisma.$transaction(async (tx) => {
        const saleLineItems: Array<{
            productId: number
            quantity: number
            unitPrice: number
            blendedUnitCost: number
            lineRevenue: number
            lineCost: number
            lineProfit: number
        }> = []

        // Process each line item with FIFO deduction
        for (const lineItem of quote.lineItems) {
            // Look up the verified cost from user input (or fall back to quote cost)
            const verifiedCost = input.verifiedCosts.find(
                (vc) => vc.productId === lineItem.productId
            )
            const lineUnitCost = verifiedCost?.unitCost ?? lineItem.unitCost

            // ─── FIFO Batch Iteration ──────────────────────
            // Fetch batches with remaining stock, oldest first
            const batches = await tx.inventoryBatch.findMany({
                where: {
                    productId: lineItem.productId,
                    remainingQty: { gt: 0 }
                },
                orderBy: { receivedAt: 'asc' }
            })

            let qtyRemaining = lineItem.quantity
            let totalCostFromBatches = 0

            for (const batch of batches) {
                if (qtyRemaining <= 0) break

                const deductQty = Math.min(qtyRemaining, batch.remainingQty)

                // Accumulate cost from this batch for blended calculation
                totalCostFromBatches += deductQty * batch.unitCost

                // Deduct from this batch
                await tx.inventoryBatch.update({
                    where: { id: batch.id },
                    data: { remainingQty: batch.remainingQty - deductQty }
                })

                qtyRemaining -= deductQty
            }

            // Safety check — should never happen due to pre-flight, but belt-and-suspenders
            if (qtyRemaining > 0) {
                throw new Error(
                    `FIFO deduction failed for product ${lineItem.product.skuNumber}. ` +
                    `Could not deduct ${qtyRemaining} remaining units.`
                )
            }

            // ─── Blended Unit Cost Calculation ─────────────
            // The mathematically pure cost based on actual FIFO batch costs
            const blendedUnitCost = Math.round((totalCostFromBatches / lineItem.quantity) * 100) / 100
            const lineRevenue = Math.round(lineItem.quantity * lineItem.unitPrice * 100) / 100
            const lineCost = Math.round(totalCostFromBatches * 100) / 100
            const lineProfit = Math.round((lineRevenue - lineCost) * 100) / 100

            saleLineItems.push({
                productId: lineItem.productId,
                quantity: lineItem.quantity,
                unitPrice: lineItem.unitPrice,
                blendedUnitCost,
                lineRevenue,
                lineCost,
                lineProfit
            })
        }

        // ─── Calculate Sale Totals ───────────────────────
        const totalRevenue = Math.round(saleLineItems.reduce((sum, li) => sum + li.lineRevenue, 0) * 100) / 100
        const totalCost = Math.round(saleLineItems.reduce((sum, li) => sum + li.lineCost, 0) * 100) / 100
        const profitAmount = Math.round((totalRevenue - totalCost) * 100) / 100
        const profitMargin = totalRevenue > 0
            ? Math.round(((totalRevenue - totalCost) / totalRevenue) * 10000) / 100
            : 0

        // ─── Create Sale Record ──────────────────────────
        const sale = await tx.sale.create({
            data: {
                saleNumber,
                quoteId: quote.id,
                totalRevenue,
                totalCost,
                profitAmount,
                profitMargin,
                lineItems: {
                    create: saleLineItems
                }
            },
            include: {
                lineItems: { include: { product: true } },
                quote: {
                    include: {
                        salesLead: { include: { client: true } },
                        lineItems: { include: { product: true } }
                    }
                }
            }
        })

        // ─── Update Quote & Lead Status ──────────────────
        await tx.quote.update({
            where: { id: quote.id },
            data: { status: 'SOLD' }
        })

        await tx.salesLead.update({
            where: { id: quote.salesLeadId },
            data: { status: 'SOLD' }
        })

        return sale
    })

    return result as unknown as SaleData
}

export async function listSales(params: ListParams = {}): Promise<PaginatedResult<SaleData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const [items, total] = await Promise.all([
        prisma.sale.findMany({
            skip,
            take: pageSize,
            include: {
                lineItems: { include: { product: true } },
                quote: {
                    include: {
                        salesLead: { include: { client: true } }
                    }
                }
            },
            orderBy: { saleDate: 'desc' }
        }),
        prisma.sale.count()
    ])

    return {
        items: items as unknown as SaleData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function getSale(id: number): Promise<SaleData> {
    const prisma = getPrisma()
    const sale = await prisma.sale.findUnique({
        where: { id },
        include: {
            lineItems: { include: { product: true } },
            quote: {
                include: {
                    salesLead: { include: { client: true } },
                    lineItems: { include: { product: true } }
                }
            }
        }
    })
    if (!sale) throw new Error(`Sale with ID ${id} not found`)
    return sale as unknown as SaleData
}
