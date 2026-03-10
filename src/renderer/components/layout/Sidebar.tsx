// ────────────────────────────────────────────────────────
// Costerra ERP — Sidebar Navigation
// Glassmorphism sidebar with collapsible module groups
// and a responsive collapse/expand design.
// ────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
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
    ChevronRight,
    ChevronDown,
    Boxes,
    Handshake
} from 'lucide-react'

// ─── Type Definitions ────────────────────────────────────

interface NavItem {
    path: string
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
}

interface NavGroup {
    label: string
    icon: React.ComponentType<{ size?: number; className?: string }>
    children: NavItem[]
}

/** A navigation entry can be either a direct link or a collapsible group */
type NavEntry = NavItem | NavGroup

/** Type guard to distinguish groups from direct links */
function isNavGroup(entry: NavEntry): entry is NavGroup {
    return 'children' in entry
}

// ─── Navigation Structure ────────────────────────────────

const NAV_ENTRIES: NavEntry[] = [
    { path: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
        label: 'Products & Inventory Management',
        icon: Boxes,
        children: [
            { path: '/products', label: 'Products', icon: Package },
            { path: '/suppliers', label: 'Suppliers', icon: Truck },
            { path: '/purchase-orders', label: 'Purchase Orders', icon: ClipboardList },
            { path: '/inventory', label: 'Inventory', icon: Warehouse },
        ]
    },
    {
        label: 'Sales and CRM',
        icon: Handshake,
        children: [
            { path: '/clients', label: 'Clients', icon: Users },
            { path: '/sales-leads', label: 'Leads', icon: Target },
            { path: '/quotes', label: 'Quotes', icon: FileText },
            { path: '/sales', label: 'Sales', icon: DollarSign },
        ]
    }
]

const BOTTOM_ITEMS: NavItem[] = [
    { path: '/settings', label: 'Settings', icon: Settings }
]

// ─── Main Sidebar Component ──────────────────────────────

export default function Sidebar() {
    const [collapsed, setCollapsed] = useState(false)

    return (
        <aside
            className={`glass-sidebar flex flex-col h-full transition-all duration-300 ${collapsed ? 'w-[68px]' : 'w-[260px]'
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
                {NAV_ENTRIES.map((entry) =>
                    isNavGroup(entry) ? (
                        <SidebarGroup key={entry.label} group={entry} collapsed={collapsed} />
                    ) : (
                        <SidebarLink key={entry.path} item={entry} collapsed={collapsed} />
                    )
                )}
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

// ─── Collapsible Group Sub-Component ─────────────────────
// Renders a parent button that toggles visibility of its
// child NavItems. Auto-opens when the current route matches
// any child path.

function SidebarGroup({ group, collapsed }: { group: NavGroup; collapsed: boolean }) {
    const location = useLocation()
    const isChildActive = group.children.some((child) => location.pathname.startsWith(child.path))
    const [open, setOpen] = useState(isChildActive)
    const Icon = group.icon

    // Auto-open the group when navigating to a child route
    useEffect(() => {
        if (isChildActive && !open) {
            setOpen(true)
        }
    }, [isChildActive])

    return (
        <div className="space-y-0.5">
            {/* ─── Group Parent Button ────────────────────── */}
            <button
                onClick={() => setOpen(!open)}
                className={`flex items-center gap-3 w-full px-3 py-2 rounded-lg transition-all duration-150
                    ${isChildActive
                        ? 'text-brand-400 bg-brand-500/10'
                        : 'text-surface-400 hover:text-surface-200 hover:bg-surface-800/40'
                    }`}
                aria-expanded={open}
                title={collapsed ? group.label : undefined}
            >
                <Icon size={18} className="flex-shrink-0" />
                <AnimatePresence>
                    {!collapsed && (
                        <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: 'auto' }}
                            exit={{ opacity: 0, width: 0 }}
                            className="text-sm font-medium whitespace-nowrap overflow-hidden flex-1 text-left"
                        >
                            {group.label}
                        </motion.span>
                    )}
                </AnimatePresence>
                {!collapsed && (
                    <motion.div
                        animate={{ rotate: open ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex-shrink-0"
                    >
                        <ChevronDown size={14} className="text-surface-500" />
                    </motion.div>
                )}
            </button>

            {/* ─── Child Links ────────────────────────────── */}
            <AnimatePresence>
                {open && !collapsed && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                    >
                        <div className="ml-4 pl-3 border-l border-surface-800/50 space-y-0.5">
                            {group.children.map((child) => (
                                <SidebarLink key={child.path} item={child} collapsed={collapsed} />
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* ─── Collapsed Tooltip Popover (icons-only) ── */}
            {collapsed && open && (
                <div className="ml-1 space-y-0.5">
                    {group.children.map((child) => (
                        <SidebarLink key={child.path} item={child} collapsed={collapsed} />
                    ))}
                </div>
            )}
        </div>
    )
}

// ─── Sidebar Link Sub-Component ──────────────────────────

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
            title={collapsed ? item.label : undefined}
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
