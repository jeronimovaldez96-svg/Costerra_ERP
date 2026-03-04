// ────────────────────────────────────────────────────────
// Costerra ERP — PO → Inventory → Sale Integration Tests
// Tests the complete end-to-end flow through the
// purchase order, inventory, and sale services.
// ────────────────────────────────────────────────────────

import { describe, it, expect } from 'vitest'
import { testPrisma } from './setup'
import { createPurchaseOrder, updatePurchaseOrderStatus } from '../src/main/services/purchase-order.service'
import { getInventorySummary, getBatchesByProduct } from '../src/main/services/inventory.service'
import { executeSale } from '../src/main/services/sale.service'

/**
 * Helper: creates base entities needed for the full pipeline.
 */
async function seedBaseline() {
    const supplier = await testPrisma.supplier.create({
        data: { name: 'Integration Supplier' }
    })

    const productA = await testPrisma.product.create({
        data: {
            skuNumber: `SKU-A-${Date.now()}`,
            productGroup: 'Tiles',
            productFamily: 'Porcelain',
            name: 'Product A',
            color: 'White',
            defaultUnitCost: 10,
            defaultUnitPrice: 25
        }
    })

    const productB = await testPrisma.product.create({
        data: {
            skuNumber: `SKU-B-${Date.now()}`,
            productGroup: 'Tiles',
            productFamily: 'Ceramic',
            name: 'Product B',
            color: 'Grey',
            defaultUnitCost: 8,
            defaultUnitPrice: 20
        }
    })

    const client = await testPrisma.client.create({
        data: {
            clientNumber: `CLI-INT-${Date.now()}`,
            name: 'Integration',
            surname: 'Client'
        }
    })

    return { supplier, productA, productB, client }
}


describe('PO → Inventory → Sale Integration Flow', () => {

    it('should complete the full lifecycle: PO create → deliver → sell', async () => {
        const { supplier, productA, client } = await seedBaseline()

        // ─── Step 1: Create Purchase Order ──────────────────
        const po = await createPurchaseOrder({
            supplierId: supplier.id,
            description: 'Integration test PO',
            items: [
                { productId: productA.id, quantity: 100, unitCost: 10 }
            ]
        })

        expect(po.poNumber).toMatch(/^PO-/)
        expect(po.status).toBe('DRAFT')
        expect(po.items).toHaveLength(1)
        expect(po.items[0].quantity).toBe(100)

        // ─── Step 2: Transition DRAFT → IN_TRANSIT ──────────
        const inTransitPo = await updatePurchaseOrderStatus(po.id, 'IN_TRANSIT')
        expect(inTransitPo.status).toBe('IN_TRANSIT')

        // Verify: no inventory created yet
        const preBatches = await getBatchesByProduct(productA.id)
        expect(preBatches).toHaveLength(0)

        // ─── Step 3: Transition IN_TRANSIT → DELIVERED ──────
        const deliveredPo = await updatePurchaseOrderStatus(po.id, 'DELIVERED')
        expect(deliveredPo.status).toBe('DELIVERED')

        // Verify: inventory batch created with correct quantities
        const postBatches = await getBatchesByProduct(productA.id)
        expect(postBatches).toHaveLength(1)
        expect(postBatches[0].initialQty).toBe(100)
        expect(postBatches[0].remainingQty).toBe(100)
        expect(postBatches[0].unitCost).toBe(10)

        // Verify: inventory summary aggregation works
        const summary = await getInventorySummary()
        const productSummary = summary.find(s => s.productId === productA.id)
        expect(productSummary).toBeDefined()
        expect(productSummary!.totalUnits).toBe(100)
        expect(productSummary!.totalStockValue).toBe(1000) // 100 * $10

        // ─── Step 4: Create Quote + Execute Sale ────────────
        const lead = await testPrisma.salesLead.create({
            data: {
                leadNumber: `LEAD-INT-${Date.now()}`,
                clientId: client.id,
                name: 'Integration Lead',
                status: 'IN_PROGRESS'
            }
        })

        const quote = await testPrisma.quote.create({
            data: {
                quoteNumber: `QT-INT-${Date.now()}`,
                salesLeadId: lead.id,
                status: 'SENT',
                lineItems: {
                    create: [{
                        productId: productA.id,
                        quantity: 30,
                        unitPrice: 25,
                        unitCost: 10,
                        lineTotal: 750 // 30 * 25
                    }]
                }
            }
        })

        const sale = await executeSale({
            quoteId: quote.id,
            verifiedCosts: []
        })

        // Verify sale record
        expect(sale.saleNumber).toMatch(/^SALE-/)
        expect(sale.totalRevenue).toBe(750)  // 30 * $25
        expect(sale.totalCost).toBe(300)     // 30 * $10 (single batch cost)
        expect(sale.profitAmount).toBe(450)  // 750 - 300
        expect(sale.profitMargin).toBe(60)   // (450/750) * 100

        // Verify inventory was reduced
        const finalBatches = await getBatchesByProduct(productA.id)
        expect(finalBatches[0].remainingQty).toBe(70) // 100 - 30

        // Verify quote and lead marked as SOLD
        const finalQuote = await testPrisma.quote.findUnique({ where: { id: quote.id } })
        expect(finalQuote!.status).toBe('SOLD')

        const finalLead = await testPrisma.salesLead.findUnique({ where: { id: lead.id } })
        expect(finalLead!.status).toBe('SOLD')
    })


    it('should enforce PO state machine transitions', async () => {
        const { supplier, productA } = await seedBaseline()

        const po = await createPurchaseOrder({
            supplierId: supplier.id,
            description: 'State machine test',
            items: [{ productId: productA.id, quantity: 50, unitCost: 10 }]
        })

        // DRAFT → DELIVERED is invalid (must go through IN_TRANSIT)
        await expect(
            updatePurchaseOrderStatus(po.id, 'DELIVERED')
        ).rejects.toThrow('Invalid status transition')

        // DRAFT → IN_TRANSIT is valid
        await updatePurchaseOrderStatus(po.id, 'IN_TRANSIT')

        // IN_TRANSIT → DRAFT is invalid (no backtracking)
        await expect(
            updatePurchaseOrderStatus(po.id, 'DRAFT')
        ).rejects.toThrow('Invalid status transition')
    })


    it('should handle multi-product PO with independent inventory batches', async () => {
        const { supplier, productA, productB } = await seedBaseline()

        const po = await createPurchaseOrder({
            supplierId: supplier.id,
            description: 'Multi-product PO',
            items: [
                { productId: productA.id, quantity: 50, unitCost: 10 },
                { productId: productB.id, quantity: 75, unitCost: 8 }
            ]
        })

        expect(po.items).toHaveLength(2)

        // Deliver the PO
        await updatePurchaseOrderStatus(po.id, 'IN_TRANSIT')
        await updatePurchaseOrderStatus(po.id, 'DELIVERED')

        // Verify separate inventory batches were created
        const batchesA = await getBatchesByProduct(productA.id)
        const batchesB = await getBatchesByProduct(productB.id)

        expect(batchesA).toHaveLength(1)
        expect(batchesA[0].remainingQty).toBe(50)

        expect(batchesB).toHaveLength(1)
        expect(batchesB[0].remainingQty).toBe(75)

        // Verify summary
        const summary = await getInventorySummary()
        expect(summary).toHaveLength(2)

        const summaryA = summary.find(s => s.productId === productA.id)!
        const summaryB = summary.find(s => s.productId === productB.id)!

        expect(summaryA.totalStockValue).toBe(500) // 50 * $10
        expect(summaryB.totalStockValue).toBe(600) // 75 * $8
    })


    it('should correctly aggregate inventory from multiple POs', async () => {
        const { supplier, productA } = await seedBaseline()

        // Create and deliver 2 separate POs with different costs
        const po1 = await createPurchaseOrder({
            supplierId: supplier.id,
            description: 'PO Batch 1',
            items: [{ productId: productA.id, quantity: 20, unitCost: 10 }]
        })
        await updatePurchaseOrderStatus(po1.id, 'IN_TRANSIT')
        await updatePurchaseOrderStatus(po1.id, 'DELIVERED')

        const po2 = await createPurchaseOrder({
            supplierId: supplier.id,
            description: 'PO Batch 2',
            items: [{ productId: productA.id, quantity: 30, unitCost: 15 }]
        })
        await updatePurchaseOrderStatus(po2.id, 'IN_TRANSIT')
        await updatePurchaseOrderStatus(po2.id, 'DELIVERED')

        // Should have 2 batches for same product
        const batches = await getBatchesByProduct(productA.id)
        expect(batches).toHaveLength(2)

        // Summary should aggregate
        const summary = await getInventorySummary()
        const productSummary = summary.find(s => s.productId === productA.id)!
        expect(productSummary.totalUnits).toBe(50)  // 20 + 30
        // Value: 20*10 + 30*15 = 200 + 450 = 650
        expect(productSummary.totalStockValue).toBe(650)
        // Avg cost: 650/50 = 13
        expect(productSummary.avgUnitCost).toBe(13)
    })
})
