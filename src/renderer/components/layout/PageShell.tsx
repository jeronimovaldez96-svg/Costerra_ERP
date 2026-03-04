// ────────────────────────────────────────────────────────
// Costerra ERP — Page Shell
// Wraps page content with consistent padding, max-width,
// Framer Motion entrance animation, and a page header.
// ────────────────────────────────────────────────────────

import { motion } from 'framer-motion'

interface PageShellProps {
    title: string
    description?: string
    actions?: React.ReactNode
    children: React.ReactNode
}

const pageVariants = {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: 'easeOut' } },
    exit: { opacity: 0, y: -4, transition: { duration: 0.15 } }
}

export default function PageShell({ title, description, actions, children }: PageShellProps) {
    return (
        <motion.div
            variants={pageVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="max-w-[1400px] mx-auto space-y-6"
        >
            {/* ─── Page Header ──────────────────────────────── */}
            <div className="flex items-start justify-between">
                <div>
                    <h2 className="text-2xl font-semibold text-surface-50">{title}</h2>
                    {description && (
                        <p className="mt-1 text-sm text-surface-400">{description}</p>
                    )}
                </div>
                {actions && <div className="flex items-center gap-2">{actions}</div>}
            </div>

            {/* ─── Page Content ─────────────────────────────── */}
            {children}
        </motion.div>
    )
}
