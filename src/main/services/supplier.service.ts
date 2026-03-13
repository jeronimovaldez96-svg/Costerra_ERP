// ────────────────────────────────────────────────────────
// Costerra ERP — Supplier Service
// CRUD with append-only SupplierHistory tracking on updates.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import type {
    SupplierData,
    SupplierCreateInput,
    SupplierUpdateInput,
    SupplierHistoryEntry,
    ListParams,
    PaginatedResult
} from '../../shared/types'

export async function listSuppliers(params: ListParams = {}): Promise<PaginatedResult<SupplierData>> {
    const prisma = getPrisma()
    const page = params.page || 1
    const pageSize = params.pageSize || 50
    const skip = (page - 1) * pageSize

    const where: Record<string, unknown> = {}

    if (params.search) {
        where.OR = [
            { name: { contains: params.search } },
            { contactName: { contains: params.search } },
            { email: { contains: params.search } }
        ]
    }

    const [items, total] = await Promise.all([
        prisma.supplier.findMany({
            where,
            skip,
            take: pageSize,
            orderBy: { [params.sortBy || 'createdAt']: params.sortDir || 'desc' }
        }),
        prisma.supplier.count({ where })
    ])

    return {
        items: items as unknown as SupplierData[],
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize)
    }
}

export async function getSupplier(id: number): Promise<SupplierData> {
    const prisma = getPrisma()
    const supplier = await prisma.supplier.findUnique({ where: { id } })
    if (!supplier) throw new Error(`Supplier with ID ${id} not found`)
    return supplier as unknown as SupplierData
}

export async function createSupplier(input: SupplierCreateInput): Promise<SupplierData> {
    const prisma = getPrisma()
    const supplier = await prisma.supplier.create({
        data: {
            name: input.name,
            contactName: input.contactName || '',
            phone: input.phone || '',
            email: input.email || '',
            notes: input.notes || ''
        }
    })
    return supplier as unknown as SupplierData
}

/**
 * Updates a supplier and records field-level changes in SupplierHistory.
 * Mirrors the Product service append-only pattern.
 */
export async function updateSupplier(input: SupplierUpdateInput): Promise<SupplierData> {
    const prisma = getPrisma()
    const existing = await prisma.supplier.findUnique({ where: { id: input.id } })
    if (!existing) throw new Error(`Supplier with ID ${input.id} not found`)

    const historyEntries: Array<{ fieldName: string; oldValue: string; newValue: string }> = []
    const updateData: Record<string, unknown> = {}

    const fields: Array<keyof SupplierUpdateInput> = [
        'name', 'contactName', 'phone', 'email', 'notes'
    ]

    for (const field of fields) {
        if (field === 'id') continue
        const newValue = input[field]
        if (newValue !== undefined) {
            const oldValue = existing[field as keyof typeof existing]
            if (String(newValue) !== String(oldValue)) {
                historyEntries.push({
                    fieldName: field,
                    oldValue: String(oldValue ?? ''),
                    newValue: String(newValue)
                })
                updateData[field] = newValue
            }
        }
    }

    // No actual changes — return existing record as-is
    if (Object.keys(updateData).length === 0) {
        return existing as unknown as SupplierData
    }

    // Atomic transaction: update supplier + insert all history entries
    const [supplier] = await prisma.$transaction([
        prisma.supplier.update({ where: { id: input.id }, data: updateData }),
        ...historyEntries.map((entry) =>
            prisma.supplierHistory.create({
                data: { supplierId: input.id, ...entry }
            })
        )
    ])

    return supplier as unknown as SupplierData
}

/**
 * Gets the full change history for a supplier, newest first.
 */
export async function getSupplierHistory(supplierId: number): Promise<SupplierHistoryEntry[]> {
    const prisma = getPrisma()
    const history = await prisma.supplierHistory.findMany({
        where: { supplierId },
        orderBy: { changedAt: 'desc' }
    })
    return history as unknown as SupplierHistoryEntry[]
}
