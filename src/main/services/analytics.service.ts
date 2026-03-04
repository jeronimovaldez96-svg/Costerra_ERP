// ────────────────────────────────────────────────────────
// Costerra ERP — Analytics Service
// Aggregate queries for the master dashboard and sales reports.
// ────────────────────────────────────────────────────────

import { getPrisma } from '../database/prisma-client'
import type {
    DashboardData,
    SaleData,
    ListParams,
    PaginatedResult
} from '../../shared/types'

/**
 * Calculates all dashboard KPIs:
 * - Total current stock value (SUM of remainingQty * unitCost)
 * - YTD Revenue, Cost, Profit
 * - Blended Profit Margin
 * - Total sales count
 * - Recent sales list
 */
export async function getDashboardData(): Promise<DashboardData> {
    const prisma = getPrisma()

    // ─── Total Stock Value ─────────────────────────────
    const inventoryAgg = await prisma.inventoryBatch.findMany({
        where: { remainingQty: { gt: 0 } }
    })
    const totalStockValue = Math.round(
        inventoryAgg.reduce((sum, batch) => sum + batch.remainingQty * batch.unitCost, 0) * 100
    ) / 100

    // ─── YTD Sales Aggregation ─────────────────────────
    const startOfYear = new Date(new Date().getFullYear(), 0, 1)
    const ytdSales = await prisma.sale.findMany({
        where: { saleDate: { gte: startOfYear } }
    })

    const ytdRevenue = Math.round(ytdSales.reduce((sum, s) => sum + s.totalRevenue, 0) * 100) / 100
    const ytdCost = Math.round(ytdSales.reduce((sum, s) => sum + s.totalCost, 0) * 100) / 100
    const ytdProfit = Math.round((ytdRevenue - ytdCost) * 100) / 100
    const blendedProfitMargin = ytdRevenue > 0
        ? Math.round(((ytdRevenue - ytdCost) / ytdRevenue) * 10000) / 100
        : 0

    // ─── Total Sales Count ─────────────────────────────
    const totalSalesCount = await prisma.sale.count()

    // ─── Recent Sales ──────────────────────────────────
    const recentSales = await prisma.sale.findMany({
        take: 10,
        include: {
            lineItems: { include: { product: true } },
            quote: { include: { salesLead: { include: { client: true } } } }
        },
        orderBy: { saleDate: 'desc' }
    })

    return {
        totalStockValue,
        ytdRevenue,
        ytdCost,
        ytdProfit,
        blendedProfitMargin,
        totalSalesCount,
        recentSales: recentSales as unknown as SaleData[]
    }
}

/**
 * Paginated sales report for the full sales ledger view.
 */
export async function getSalesReport(params: ListParams = {}): Promise<PaginatedResult<SaleData>> {
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
                quote: { include: { salesLead: { include: { client: true } } } }
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
