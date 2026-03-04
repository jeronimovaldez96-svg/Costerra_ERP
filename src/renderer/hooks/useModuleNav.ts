// ────────────────────────────────────────────────────────
// Costerra ERP — Cross-Module Navigation Hook
// Provides typed navigation helpers for deep-linking
// between ERP modules (e.g., clicking a client in a
// sales lead detail opens the client profile).
// ────────────────────────────────────────────────────────

import { useNavigate } from 'react-router-dom'
import { useCallback, useMemo } from 'react'

/**
 * Cross-module navigation helper.
 *
 * Usage:
 * ```tsx
 * const nav = useModuleNav()
 * <button onClick={() => nav.toClient(client.id)}>View Client</button>
 * ```
 */
export function useModuleNav() {
    const navigate = useNavigate()

    const toProducts = useCallback(() => navigate('/products'), [navigate])
    const toSuppliers = useCallback(() => navigate('/suppliers'), [navigate])
    const toPurchaseOrders = useCallback(() => navigate('/purchase-orders'), [navigate])
    const toInventory = useCallback(() => navigate('/inventory'), [navigate])
    const toClients = useCallback(() => navigate('/clients'), [navigate])
    const toSalesLeads = useCallback(() => navigate('/sales-leads'), [navigate])
    const toQuotes = useCallback(() => navigate('/quotes'), [navigate])
    const toSales = useCallback(() => navigate('/sales'), [navigate])
    const toDashboard = useCallback(() => navigate('/dashboard'), [navigate])
    const toSettings = useCallback(() => navigate('/settings'), [navigate])

    return useMemo(
        () => ({
            toProducts,
            toSuppliers,
            toPurchaseOrders,
            toInventory,
            toClients,
            toSalesLeads,
            toQuotes,
            toSales,
            toDashboard,
            toSettings
        }),
        [
            toProducts,
            toSuppliers,
            toPurchaseOrders,
            toInventory,
            toClients,
            toSalesLeads,
            toQuotes,
            toSales,
            toDashboard,
            toSettings
        ]
    )
}
