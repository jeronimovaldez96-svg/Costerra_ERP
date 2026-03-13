// ────────────────────────────────────────────────────────
// Costerra ERP — Shared TypeScript Types
// Imported by both Main (services) and Renderer (UI).
// ────────────────────────────────────────────────────────

import type { PoStatus, LeadStatus, QuoteStatus } from '../constants'

// ─── Generic ─────────────────────────────────────────

/** Standard IPC response wrapper */
export interface IpcResponse<T = unknown> {
    success: boolean
    data?: T
    error?: string
}

/** Pagination params for list queries */
export interface ListParams {
    page?: number
    pageSize?: number
    search?: string
    sortBy?: string
    sortDir?: 'asc' | 'desc'
    filters?: Record<string, string | number | boolean>
}

/** Paginated list result */
export interface PaginatedResult<T> {
    items: T[]
    total: number
    page: number
    pageSize: number
    totalPages: number
}

// ─── Product ─────────────────────────────────────────

export interface ProductData {
    id: number
    skuNumber: string
    productGroup: string
    productFamily: string
    name: string
    color: string
    imagePath: string | null
    defaultUnitCost: number
    defaultUnitPrice: number
    isActive: boolean
    createdAt: string
    updatedAt: string
}

export interface ProductCreateInput {
    productGroup: string
    productFamily: string
    name: string
    color: string
    imagePath?: string
    defaultUnitCost: number
    defaultUnitPrice: number
}

export interface ProductUpdateInput {
    id: number
    productGroup?: string
    productFamily?: string
    name?: string
    color?: string
    imagePath?: string
    defaultUnitCost?: number
    defaultUnitPrice?: number
}

export interface ProductHistoryEntry {
    id: number
    productId: number
    fieldName: string
    oldValue: string
    newValue: string
    changedAt: string
}

// ─── Supplier ────────────────────────────────────────

export interface SupplierData {
    id: number
    name: string
    contactName: string
    phone: string
    email: string
    notes: string
    createdAt: string
}

export interface SupplierCreateInput {
    name: string
    contactName?: string
    phone?: string
    email?: string
    notes?: string
}

export interface SupplierUpdateInput {
    id: number
    name?: string
    contactName?: string
    phone?: string
    email?: string
    notes?: string
}

export interface SupplierHistoryEntry {
    id: number
    supplierId: number
    fieldName: string
    oldValue: string
    newValue: string
    changedAt: string
}

// ─── Purchase Order ──────────────────────────────────

export interface PurchaseOrderData {
    id: number
    poNumber: string
    supplierId: number
    description: string
    status: PoStatus
    createdAt: string
    updatedAt: string
    supplier?: SupplierData
    items?: PurchaseOrderItemData[]
}

export interface PurchaseOrderItemData {
    id: number
    purchaseOrderId: number
    productId: number
    quantity: number
    unitCost: number
    product?: ProductData
}

export interface PurchaseOrderCreateInput {
    supplierId: number
    description?: string
    items: Array<{
        productId: number
        quantity: number
        unitCost: number
    }>
}

// ─── Inventory ───────────────────────────────────────

export interface InventoryBatchData {
    id: number
    productId: number
    purchaseOrderItemId: number
    initialQty: number
    remainingQty: number
    reservedQty: number
    unitCost: number
    receivedAt: string
    product?: ProductData
}

export interface InventorySummary {
    productId: number
    skuNumber: string
    productName: string
    productGroup: string
    productFamily: string
    color: string
    totalUnits: number
    availableUnits: number
    reservedUnits: number
    avgUnitCost: number
    totalStockValue: number
}

// ─── Client ──────────────────────────────────────────

export interface ClientData {
    id: number
    clientNumber: string
    name: string
    surname: string
    address: string
    city: string
    zipCode: string
    phone: string
    notes: string
    createdAt: string
    updatedAt: string
}

export interface ClientCreateInput {
    name: string
    surname: string
    address?: string
    city?: string
    zipCode?: string
    phone?: string
    notes?: string
}

export interface ClientUpdateInput {
    id: number
    name?: string
    surname?: string
    address?: string
    city?: string
    zipCode?: string
    phone?: string
    notes?: string
}

export interface ClientHistoryEntry {
    id: number
    clientId: number
    fieldName: string
    oldValue: string
    newValue: string
    changedAt: string
}

// ─── Sales Lead ──────────────────────────────────────

export interface SalesLeadData {
    id: number
    leadNumber: string
    clientId: number
    name: string
    status: LeadStatus
    createdAt: string
    updatedAt: string
    client?: ClientData
    quotes?: QuoteData[]
}

export interface SalesLeadCreateInput {
    clientId: number
    name: string
}

// ─── Quote ───────────────────────────────────────────

export interface QuoteData {
    id: number
    quoteNumber: string
    salesLeadId: number
    status: QuoteStatus
    notes: string
    taxRate: number
    taxAmount: number
    createdAt: string
    updatedAt: string
    salesLead?: SalesLeadData
    lineItems?: QuoteLineItemData[]
    sale?: SaleData | null
}

export interface QuoteLineItemData {
    id: number
    quoteId: number
    productId: number
    quantity: number
    unitPrice: number
    unitCost: number
    lineTotal: number
    product?: ProductData
}

export interface QuoteCreateInput {
    salesLeadId: number
    notes?: string
    taxRate?: number
}

export interface QuoteLineItemInput {
    quoteId: number
    productId: number
    quantity: number
    unitPrice: number
    unitCost: number
}

// ─── Sale ────────────────────────────────────────────

export interface SaleData {
    id: number
    saleNumber: string
    quoteId: number
    totalRevenue: number
    taxAmount: number
    totalCost: number
    profitAmount: number
    profitMargin: number
    saleDate: string
    quote?: QuoteData
    lineItems?: SaleLineItemData[]
}

export interface SaleLineItemData {
    id: number
    saleId: number
    productId: number
    quantity: number
    unitPrice: number
    blendedUnitCost: number
    lineRevenue: number
    lineCost: number
    lineProfit: number
    product?: ProductData
}

/** Cost verification payload sent from Renderer before executing a sale */
export interface SaleExecuteInput {
    quoteId: number
    verifiedCosts: Array<{
        productId: number
        unitCost: number
    }>
}

// ─── Analytics ───────────────────────────────────────

export interface DashboardData {
    totalStockValue: number
    ytdRevenue: number
    ytdCost: number
    ytdProfit: number
    blendedProfitMargin: number
    totalSalesCount: number
    recentSales: SaleData[]
}

// ─── Backup ──────────────────────────────────────────

export interface BackupLogData {
    id: number
    filename: string
    filePath: string
    sizeBytes: number
    createdAt: string
}
