// ────────────────────────────────────────────────────────
// Costerra ERP — Product Service
// Business logic for Product CRUD with append-only
// history tracking on every update.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import { generateId } from '../utils/id-generator'
import type {
    ProductData,
    ProductCreateInput,
    ProductUpdateInput,
    ProductHistoryEntry,
    ListParams,
    PaginatedResult
} from '../../shared/types'

/**
 * Lists products with pagination, search, and filtering.
 */
export async function listProducts(params: ListParams = {}): Promise<PaginatedResult<ProductData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    // Filter by active status
    if (params.filters?.isActive !== undefined) {
        where.isActive = params.filters.isActive
    }

    // Search by name, SKU, group, or family
    if (params.search) {
        where.OR = [
            { name: { contains: params.search } },
            { skuNumber: { contains: params.search } },
            { productGroup: { contains: params.search } },
            { productFamily: { contains: params.search } },
            { color: { contains: params.search } }
        ]
    }

    const [items, total] = await Promise.all([
        prisma.product.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { [params.sortBy || 'createdAt']: params.sortDir || 'desc' }
        }),
        prisma.product.count({ where })
    ])

    return {
        items: items as unknown as ProductData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

/**
 * Gets a single product by ID.
 */
export async function getProduct(id: number): Promise<ProductData> {
    const prisma = getPrisma()
    const product = await prisma.product.findUnique({ where: { id } })

    if (!product) {
        throw new Error(`Product with ID ${id} not found`)
    }

    return product as unknown as ProductData
}

/**
 * Creates a new product with an auto-generated SKU number.
 */
export async function createProduct(input: ProductCreateInput): Promise<ProductData> {
    const prisma = getPrisma()
    const skuNumber = await generateId('SKU')

    const product = await prisma.product.create({
        data: {
            skuNumber,
            productGroup: input.productGroup,
            productFamily: input.productFamily,
            name: input.name,
            color: input.color,
            imagePath: input.imagePath || null,
            defaultUnitCost: input.defaultUnitCost,
            defaultUnitPrice: input.defaultUnitPrice
        }
    })

    return product as unknown as ProductData
}

/**
 * Updates a product and records field-level changes in ProductHistory.
 * Non-destructive: every change is tracked via append-only history inserts.
 */
export async function updateProduct(input: ProductUpdateInput): Promise<ProductData> {
    const prisma = getPrisma()
    const existing = await prisma.product.findUnique({ where: { id: input.id } })

    if (!existing) {
        throw new Error(`Product with ID ${input.id} not found`)
    }

    // Track which fields changed for history
    const historyEntries: Array<{ fieldName: string; oldValue: string; newValue: string }> = []
    const updateData: Record<string, unknown> = {}

    const trackableFields: Array<{ key: keyof ProductUpdateInput; label: string }> = [
        { key: 'productGroup', label: 'productGroup' },
        { key: 'productFamily', label: 'productFamily' },
        { key: 'name', label: 'name' },
        { key: 'color', label: 'color' },
        { key: 'imagePath', label: 'imagePath' },
        { key: 'defaultUnitCost', label: 'defaultUnitCost' },
        { key: 'defaultUnitPrice', label: 'defaultUnitPrice' }
    ]

    for (const field of trackableFields) {
        const newValue = input[field.key]
        if (newValue !== undefined) {
            const oldValue = existing[field.key as keyof typeof existing]
            if (String(newValue) !== String(oldValue)) {
                historyEntries.push({
                    fieldName: field.label,
                    oldValue: String(oldValue ?? ''),
                    newValue: String(newValue)
                })
                updateData[field.key] = newValue
            }
        }
    }

    // Only update if there are actual changes
    if (Object.keys(updateData).length === 0) {
        return existing as unknown as ProductData
    }

    // Atomic transaction: update product + insert all history entries
    const [product] = await prisma.$transaction([
        prisma.product.update({
            where: { id: input.id },
            data: updateData
        }),
        ...historyEntries.map((entry) =>
            prisma.productHistory.create({
                data: {
                    productId: input.id,
                    ...entry
                }
            })
        )
    ])

    return product as unknown as ProductData
}

/**
 * Toggles a product's isActive status (soft-delete / reactivation).
 */
export async function toggleActive(id: number): Promise<ProductData> {
    const prisma = getPrisma()
    const existing = await prisma.product.findUnique({ where: { id } })

    if (!existing) {
        throw new Error(`Product with ID ${id} not found`)
    }

    const product = await prisma.product.update({
        where: { id },
        data: { isActive: !existing.isActive }
    })

    return product as unknown as ProductData
}

/**
 * Gets the full change history for a product, newest first.
 */
export async function getProductHistory(productId: number): Promise<ProductHistoryEntry[]> {
    const prisma = getPrisma()
    const history = await prisma.productHistory.findMany({
        where: { productId },
        orderBy: { changedAt: 'desc' }
    })

    return history as unknown as ProductHistoryEntry[]
}
