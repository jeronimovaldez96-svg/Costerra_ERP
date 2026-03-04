// ────────────────────────────────────────────────────────
// Costerra ERP — Sidebar Navigation
// Glassmorphism sidebar with module navigation links
// and a collapsible design.
// ────────────────────────────────────────────────────────

import { useState } from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutDashboard,
    Package,
    Truck,
    ClipboardList,
    Warehouse,
    Users,
    Target,
    FileText,
    DollarSign,
    Settings,
    ChevronLeft,
    ChevronRight
} from 'lucide-react'

interface NavItem {
    path: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
}

const NAV_ITEMS: NavItem[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/products', label: 'Products', icon: Package },
    { path: '/suppliers', label: 'Suppliers', icon: Truck },
    { path: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
    { path: '/inventory', label: 'Inventory', icon: Warehouse },
    { path: '/clients', label: 'Clients', icon: Users },
    { path: '/sales-leads', label: 'Sales Leads', icon: Target },
    { path: '/quotes', label: 'Quotes', icon: FileText },
    { path: '/sales', label: 'Sales', icon: DollarSign },
]

const BOTTOM_ITEMS: NavItem[] = [
    { path: '/settings', label: 'Settings', icon: Settings }
]

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)
    const location = useLocation()

    return (
        <aside
            className={`glass-sidebar flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[240px]'
                }`}
        >
            {/* ─── Logo / Brand ─────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 h-14 border-b border-surface-800/50 drag-region">
                <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-brand-500 no-drag">
                    <span className="text-sm font-bold text-white">C</span>
                </div>
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-sm font-semibold text-surface-100 whitespace-nowrap overflow-hidden"
                        >
                            Costerra ERP
                        </motion.span>
                    )}
                </AnimatePresence>
            </div>

            {/* ─── Main Navigation ──────────────────────────── */}
            <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
                {NAV_ITEMS.map((item) => (
                    <SidebarLink key={item.path} item={item} collapsed={collapsed} />
                ))}
            </nav>

            {/* ─── Bottom Section ───────────────────────────── */}
            <div className="py-3 px-2 border-t border-surface-800/50 space-y-0.5">
                {BOTTOM_ITEMS.map((item) => (
                    <SidebarLink key={item.path} item={item} collapsed={collapsed} />
                ))}

                {/* Collapse Toggle */}
                <button
                    onClick={() => setCollapsed(!collapsed)}
                    className="flex items-center gap-3 w-full px-3 py-2 rounded-lg
                     text-surface-400 hover:text-surface-200 hover:bg-surface-800/40
                     transition-all duration-150"
                    aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
                    <AnimatePresence>
                        {!collapsed && (
                            <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="text-sm whitespace-nowrap"
                            >
                                Collapse
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>
            </div>
        </aside>
    )
}

// ─── Sidebar Link Sub-Component ──────────────────────

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
    const Icon = item.icon

    return (
        <NavLink
            to={item.path}
            className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
         ${isActive
                    ? 'bg-brand-500/15 text-brand-400 border border-brand-500/20'
                    : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40 border border-transparent'
                }`
            }
        >
            <Icon size={18} className="flex-shrink-0" />
            <AnimatePresence>
                {!collapsed && (
                    <motion.span
                        initial={{ opacity: 0, width: 0 }}
                        animate={{ opacity: 1, width: 'auto' }}
                        exit={{ opacity: 0, width: 0 }}
                        className="text-sm font-medium whitespace-nowrap overflow-hidden"
                    >
                        {item.label}
                    </motion.span>
                )}
            </AnimatePresence>
        </NavLink>
    )
}
