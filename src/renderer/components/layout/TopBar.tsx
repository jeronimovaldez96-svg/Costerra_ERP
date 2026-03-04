// ────────────────────────────────────────────────────────
// Costerra ERP — Top Bar
// Displays breadcrumbs, page title, and a global search.
// ────────────────────────────────────────────────────────

import { useLocation } from 'react-router-dom'
import { Search } from 'lucide-react'

/** Maps pathname segments to human-readable labels */
const SEGMENT_LABELS: Record<string, string> = {
    dashboard: 'Dashboard',
    products: 'Products',
    suppliers: 'Suppliers',
    'purchase-orders': 'Purchase Orders',
    inventory: 'Inventory',
    clients: 'Clients',
    'sales-leads': 'Sales Leads',
    quotes: 'Quotes',
    sales: 'Sales',
    settings: 'Settings'
}

export default function TopBar() {
    const location = useLocation()
    const segments = location.pathname.split('/').filter(Boolean)

    // Derive page title from the first path segment
    const pageTitle = SEGMENT_LABELS[segments[0]] || 'Costerra ERP'

    return (
        <header className="flex items-center justify-between h-14 px-6
                        border-b border-surface-800/50 bg-surface-950/60
                        backdrop-blur-[8px] no-print">
            {/* ─── Breadcrumb / Title ───────────────────────── */}
            <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-surface-100">{pageTitle}</h1>
                {segments.length > 1 && (
                    <div className="flex items-center gap-1 text-sm text-surface-500">
                        {segments.slice(1).map((segment, i) => (
                            <span key={i} className="flex items-center gap-1">
                                <span className="text-surface-600">/</span>
                                <span className="capitalize">{SEGMENT_LABELS[segment] || segment}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Search Bar ───────────────────────────────── */}
            <div className="relative w-72">
                <Search
                    size={16}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500"
                />
                <input
                    type="text"
                    placeholder="Search..."
                    className="input-base pl-9 py-2 text-sm bg-surface-900/60"
                />
            </div>
        </header>
    )
}
