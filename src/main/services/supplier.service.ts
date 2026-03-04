// ────────────────────────────────────────────────────────
// Costerra ERP — Supplier Service
// Lightweight CRUD for vendor management.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import type {
    SupplierData,
    SupplierCreateInput,
    SupplierUpdateInput,
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
            email: input.email || ''
        }
    })
    return supplier as unknown as SupplierData
}

export async function updateSupplier(input: SupplierUpdateInput): Promise<SupplierData> {
    const prisma = getPrisma()
    const existing = await prisma.supplier.findUnique({ where: { id: input.id } })
    if (!existing) throw new Error(`Supplier with ID ${input.id} not found`)

    const updateData: Record<string, unknown> = {}
    if (input.name !== undefined) updateData.name = input.name
    if (input.contactName !== undefined) updateData.contactName = input.contactName
    if (input.phone !== undefined) updateData.phone = input.phone
    if (input.email !== undefined) updateData.email = input.email

    const supplier = await prisma.supplier.update({
        where: { id: input.id },
        data: updateData
    })
    return supplier as unknown as SupplierData
}
