// ────────────────────────────────────────────────────────
// Costerra ERP — Toast Notification Component
// Renders toast notifications from the Zustand toast store.
// ────────────────────────────────────────────────────────

import { motion, AnimatePresence } from 'framer-motion'
import { X, CheckCircle, AlertTriangle, XCircle, Info } from 'lucide-react'
import { useToastStore } from '../../stores/toast.store'
import type { ToastType } from '../../stores/toast.store'

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} className="text-success-500" />,
    error: <XCircle size={18} className="text-danger-500" />,
    warning: <AlertTriangle size={18} className="text-warning-500" />,
    info: <Info size={18} className="text-brand-400" />
}

const TOAST_BORDERS: Record<ToastType, string> = {
    success: 'border-l-success-500',
    error: 'border-l-danger-500',
    warning: 'border-l-warning-500',
    info: 'border-l-brand-500'
}

export default function ToastContainer() {
    const { toasts, removeToast } = useToastStore()

    return (
        <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <motion.div
                        key={toast.id}
                        layout
                        initial={{ opacity: 0, x: 40, scale: 0.95 }}
                        animate={{ opacity: 1, x: 0, scale: 1 }}
                        exit={{ opacity: 0, x: 40, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`
              flex items-start gap-3 p-4 rounded-lg border-l-4
              bg-surface-900/90 backdrop-blur-[12px] border border-surface-700/30
              shadow-glass-lg ${TOAST_BORDERS[toast.type]}
            `}
                    >
                        <span className="flex-shrink-0 mt-0.5">{TOAST_ICONS[toast.type]}</span>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-surface-100">{toast.title}</p>
                            {toast.message && (
                                <p className="text-xs text-surface-400 mt-0.5 leading-relaxed">{toast.message}</p>
                            )}
                        </div>
                        <button
                            onClick={() => removeToast(toast.id)}
                            className="flex-shrink-0 text-surface-500 hover:text-surface-300 transition-colors"
                        >
                            <X size={14} />
                        </button>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    )
}
