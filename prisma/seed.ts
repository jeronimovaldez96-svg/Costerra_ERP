// ────────────────────────────────────────────────────────
// Costerra ERP — Prisma Seed Script
// Populates the database with sample data for development.
// Run: npm run prisma:seed
// Reset: npm run prisma:reset (deletes all data + re-seeds)
// ────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
    console.log('🌱 Seeding Costerra ERP database...\n')

    // ─── Suppliers ─────────────────────────────────────
    const supplier1 = await prisma.supplier.create({
        data: {
            name: 'Global Materials Inc.',
            contactName: 'Maria Fernandez',
            phone: '+1-555-0101',
            email: 'maria@globalmaterials.com'
        }
    })

    const supplier2 = await prisma.supplier.create({
        data: {
            name: 'Pacific Trading Co.',
            contactName: 'James Nakamura',
            phone: '+1-555-0202',
            email: 'james@pacifictrading.com'
        }
    })

    console.log(`  ✓ Created ${2} suppliers`)

    // ─── Products ──────────────────────────────────────
    const products = await Promise.all([
        prisma.product.create({
            data: {
                skuNumber: 'SKU-00001',
                productGroup: 'Tiles',
                productFamily: 'Porcelain',
                name: 'Arctic White Porcelain Tile',
                color: 'White',
                defaultUnitCost: 12.50,
                defaultUnitPrice: 24.99
            }
        }),
        prisma.product.create({
            data: {
                skuNumber: 'SKU-00002',
                productGroup: 'Tiles',
                productFamily: 'Ceramic',
                name: 'Sahara Sand Ceramic Tile',
                color: 'Sand',
                defaultUnitCost: 8.75,
                defaultUnitPrice: 18.50
            }
        }),
        prisma.product.create({
            data: {
                skuNumber: 'SKU-00003',
                productGroup: 'Stone',
                productFamily: 'Marble',
                name: 'Carrara Marble Slab',
                color: 'White/Grey',
                defaultUnitCost: 85.00,
                defaultUnitPrice: 165.00
            }
        }),
        prisma.product.create({
            data: {
                skuNumber: 'SKU-00004',
                productGroup: 'Stone',
                productFamily: 'Granite',
                name: 'Absolute Black Granite',
                color: 'Black',
                defaultUnitCost: 55.00,
                defaultUnitPrice: 110.00
            }
        }),
        prisma.product.create({
            data: {
                skuNumber: 'SKU-00005',
                productGroup: 'Tiles',
                productFamily: 'Mosaic',
                name: 'Ocean Blue Glass Mosaic',
                color: 'Blue',
                defaultUnitCost: 22.00,
                defaultUnitPrice: 45.00
            }
        })
    ])

    console.log(`  ✓ Created ${products.length} products`)

    // ─── Clients ───────────────────────────────────────
    const client1 = await prisma.client.create({
        data: {
            clientNumber: 'CLI-00001',
            name: 'Sarah',
            surname: 'Mitchell',
            address: '742 Evergreen Terrace',
            city: 'Springfield',
            zipCode: '62704',
            phone: '+1-555-0301',
            notes: 'Preferred client. Interested in porcelain tiles for kitchen remodel.'
        }
    })

    const client2 = await prisma.client.create({
        data: {
            clientNumber: 'CLI-00002',
            name: 'David',
            surname: 'Chen',
            address: '1600 Pennsylvania Ave',
            city: 'Washington',
            zipCode: '20500',
            phone: '+1-555-0302',
            notes: 'Commercial contractor. Large volume orders.'
        }
    })

    console.log(`  ✓ Created ${2} clients`)

    // ─── Purchase Order (Delivered) ────────────────────
    const po1 = await prisma.purchaseOrder.create({
        data: {
            poNumber: 'PO-00001',
            supplierId: supplier1.id,
            description: 'Initial inventory stock — Tiles',
            status: 'DELIVERED',
            items: {
                create: [
                    { productId: products[0].id, quantity: 200, unitCost: 12.50 },
                    { productId: products[1].id, quantity: 150, unitCost: 8.75 },
                    { productId: products[4].id, quantity: 100, unitCost: 22.00 }
                ]
            }
        },
        include: { items: true }
    })

    // Create inventory batches for delivered PO
    for (const item of po1.items) {
        await prisma.inventoryBatch.create({
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

    const po2 = await prisma.purchaseOrder.create({
        data: {
            poNumber: 'PO-00002',
            supplierId: supplier2.id,
            description: 'Stone collection — Q1',
            status: 'DELIVERED',
            items: {
                create: [
                    { productId: products[2].id, quantity: 50, unitCost: 85.00 },
                    { productId: products[3].id, quantity: 75, unitCost: 55.00 }
                ]
            }
        },
        include: { items: true }
    })

    for (const item of po2.items) {
        await prisma.inventoryBatch.create({
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

    console.log(`  ✓ Created ${2} purchase orders (DELIVERED) with inventory batches`)

    // ─── Sales Lead + Quote ────────────────────────────
    const lead1 = await prisma.salesLead.create({
        data: {
            leadNumber: 'LEAD-00001',
            clientId: client1.id,
            name: 'Kitchen Remodel Project — Mitchell',
            status: 'IN_PROGRESS'
        }
    })

    await prisma.quote.create({
        data: {
            quoteNumber: 'QUO-00001',
            salesLeadId: lead1.id,
            status: 'DRAFT',
            notes: 'Quote for kitchen backsplash and floor tiles',
            lineItems: {
                create: [
                    {
                        productId: products[0].id,
                        quantity: 50,
                        unitPrice: 24.99,
                        unitCost: 12.50,
                        lineTotal: 50 * 24.99
                    },
                    {
                        productId: products[4].id,
                        quantity: 20,
                        unitPrice: 45.00,
                        unitCost: 22.00,
                        lineTotal: 20 * 45.00
                    }
                ]
            }
        }
    })

    console.log(`  ✓ Created 1 sales lead with 1 draft quote`)

    console.log('\n✅ Seed complete! Database is ready for development.\n')
    console.log('  ℹ  To reset and re-seed: npm run prisma:reset')
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
