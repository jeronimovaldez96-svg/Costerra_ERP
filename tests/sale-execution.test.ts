// ────────────────────────────────────────────────────────
// Costerra ERP — Sale Execution Unit Tests
// Tests FIFO deduction, blended cost calculation,
// stock validation, and edge cases.
// ────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { testPrisma } from './setup'
import { executeSale } from '../src/main/services/sale.service'

/**
 * Helper: creates a minimal product, supplier, client, lead, quote,
 * and inventory setup for testing sale execution.
 */
async function seedSaleScenario(opts: {
    productCosts: Array<{ unitCost: number; qty: number }>
    quoteUnitPrice: number
    quoteQty: number
}) {
    // Product
    const product = await testPrisma.product.create({
        data: {
            skuNumber: `SKU-TEST-${Date.now()}`,
            productGroup: 'Test Group',
            productFamily: 'Test Family',
            name: 'Test Product',
            color: 'Blue',
            defaultUnitCost: opts.productCosts[0]?.unitCost ?? 10,
            defaultUnitPrice: opts.quoteUnitPrice
        }
    })

    // Supplier
    const supplier = await testPrisma.supplier.create({
        data: { name: 'Test Supplier' }
    })

    // PO + Items (one per batch)
    const po = await testPrisma.purchaseOrder.create({
        data: {
            poNumber: `PO-TEST-${Date.now()}`,
            supplierId: supplier.id,
            status: 'DELIVERED'
        }
    })

    // Create inventory batches (FIFO order by creation time)
    for (let i = 0; i < opts.productCosts.length; i++) {
        const batch = opts.productCosts[i]
        const poItem = await testPrisma.purchaseOrderItem.create({
            data: {
                purchaseOrderId: po.id,
                productId: product.id,
                quantity: batch.qty,
                unitCost: batch.unitCost
            }
        })

        await testPrisma.inventoryBatch.create({
            data: {
                productId: product.id,
                purchaseOrderItemId: poItem.id,
                initialQty: batch.qty,
                remainingQty: batch.qty,
                reservedQty: 0,
                unitCost: batch.unitCost,
                // Ensure FIFO order: each batch is 1 hour after the previous
                receivedAt: new Date(Date.now() - (opts.productCosts.length - i) * 3600000)
            }
        })
    }

    // Client → Lead → Quote
    const client = await testPrisma.client.create({
        data: {
            clientNumber: `CLI-TEST-${Date.now()}`,
            name: 'Test',
            surname: 'Client'
        }
    })

    const lead = await testPrisma.salesLead.create({
        data: {
            leadNumber: `LEAD-TEST-${Date.now()}`,
            clientId: client.id,
            name: 'Test Lead',
            status: 'IN_PROGRESS'
        }
    })

    const quote = await testPrisma.quote.create({
        data: {
            quoteNumber: `QT-TEST-${Date.now()}`,
            salesLeadId: lead.id,
            status: 'SENT',
            lineItems: {
                create: [{
                    productId: product.id,
                    quantity: opts.quoteQty,
                    unitPrice: opts.quoteUnitPrice,
                    unitCost: opts.productCosts[0]?.unitCost ?? 10,
                    lineTotal: opts.quoteQty * opts.quoteUnitPrice
                }]
            }
        }
    })

    return { product, supplier, po, client, lead, quote }
}


describe('Sale Execution — FIFO Logic', () => {

    it('should deduct from oldest batch first (FIFO)', async () => {
        // Batch 1: 10 units at $5 (oldest)
        // Batch 2: 20 units at $8 (newer)
        // Selling: 15 units → should use all 10 from Batch 1 + 5 from Batch 2
        const { quote, product } = await seedSaleScenario({
            productCosts: [
                { unitCost: 5, qty: 10 },
                { unitCost: 8, qty: 20 }
            ],
            quoteUnitPrice: 20,
            quoteQty: 15
        })

        const sale = await executeSale({
            quoteId: quote.id,
            verifiedCosts: []
        })

        // Verify blended cost = (10*5 + 5*8) / 15 = 90/15 = 6.00
        expect(sale.lineItems![0].blendedUnitCost).toBe(6)

        // Verify batch deductions
        const batches = await testPrisma.inventoryBatch.findMany({
            where: { productId: product.id },
            orderBy: { receivedAt: 'asc' }
        })

        // Batch 1 should be fully depleted
        expect(batches[0].remainingQty).toBe(0)
        // Batch 2 should have 15 remaining (20 - 5)
        expect(batches[1].remainingQty).toBe(15)
    })


    it('should calculate correct blended cost from single batch', async () => {
        // Single batch: 50 units at $12.50
        const { quote } = await seedSaleScenario({
            productCosts: [{ unitCost: 12.50, qty: 50 }],
            quoteUnitPrice: 25,
            quoteQty: 10
        })

        const sale = await executeSale({
            quoteId: quote.id,
            verifiedCosts: []
        })

        // Blended cost from single batch = exactly that batch's cost
        expect(sale.lineItems![0].blendedUnitCost).toBe(12.50)
        // Revenue = 10 * 25 = 250
        expect(sale.totalRevenue).toBe(250)
        // Cost = 10 * 12.50 = 125
        expect(sale.totalCost).toBe(125)
        // Profit = 250 - 125 = 125
        expect(sale.profitAmount).toBe(125)
        // Margin = 125/250 * 100 = 50%
        expect(sale.profitMargin).toBe(50)
    })


    it('should calculate blended cost across 3 batches', async () => {
        // Batch 1: 3 units at $10 (oldest)
        // Batch 2: 5 units at $15
        // Batch 3: 10 units at $20 (newest)
        // Selling: 12 units → 3@$10 + 5@$15 + 4@$20 = 30+75+80 = 185
        // Blended = 185/12 = 15.4166... → rounds to 15.42
        const { quote } = await seedSaleScenario({
            productCosts: [
                { unitCost: 10, qty: 3 },
                { unitCost: 15, qty: 5 },
                { unitCost: 20, qty: 10 }
            ],
            quoteUnitPrice: 30,
            quoteQty: 12
        })

        const sale = await executeSale({
            quoteId: quote.id,
            verifiedCosts: []
        })

        expect(sale.lineItems![0].blendedUnitCost).toBe(15.42)
        // Total cost = 185 (exact)
        expect(sale.totalCost).toBe(185)
        // Revenue = 12 * 30 = 360
        expect(sale.totalRevenue).toBe(360)
    })


    it('should reject sale when stock is insufficient', async () => {
        // Only 5 units available, trying to sell 10
        const { quote } = await seedSaleScenario({
            productCosts: [{ unitCost: 10, qty: 5 }],
            quoteUnitPrice: 25,
            quoteQty: 10
        })

        await expect(executeSale({
            quoteId: quote.id,
            verifiedCosts: []
        })).rejects.toThrow('Insufficient stock')
    })


    it('should reject duplicate sale on same quote', async () => {
        const { quote } = await seedSaleScenario({
            productCosts: [{ unitCost: 10, qty: 20 }],
            quoteUnitPrice: 25,
            quoteQty: 5
        })

        // First sale should succeed
        await executeSale({ quoteId: quote.id, verifiedCosts: [] })

        // Second sale on same quote should throw
        await expect(executeSale({
            quoteId: quote.id,
            verifiedCosts: []
        })).rejects.toThrow('already been converted')
    })


    it('should update quote status to SOLD', async () => {
        const { quote } = await seedSaleScenario({
            productCosts: [{ unitCost: 10, qty: 20 }],
            quoteUnitPrice: 25,
            quoteQty: 5
        })

        await executeSale({ quoteId: quote.id, verifiedCosts: [] })

        const updatedQuote = await testPrisma.quote.findUnique({ where: { id: quote.id } })
        expect(updatedQuote?.status).toBe('SOLD')
    })


    it('should update lead status to SOLD', async () => {
        const { quote, lead } = await seedSaleScenario({
            productCosts: [{ unitCost: 10, qty: 20 }],
            quoteUnitPrice: 25,
            quoteQty: 5
        })

        await executeSale({ quoteId: quote.id, verifiedCosts: [] })

        const updatedLead = await testPrisma.salesLead.findUnique({ where: { id: lead.id } })
        expect(updatedLead?.status).toBe('SOLD')
    })


    it('should deplete entire batch when selling exact batch quantity', async () => {
        const { quote, product } = await seedSaleScenario({
            productCosts: [{ unitCost: 10, qty: 10 }],
            quoteUnitPrice: 25,
            quoteQty: 10
        })

        await executeSale({ quoteId: quote.id, verifiedCosts: [] })

        const batches = await testPrisma.inventoryBatch.findMany({
            where: { productId: product.id }
        })
        expect(batches[0].remainingQty).toBe(0)
    })
})
