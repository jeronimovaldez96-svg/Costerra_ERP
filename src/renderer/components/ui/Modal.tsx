// ────────────────────────────────────────────────────────
// Costerra ERP — Modal Component
// Reusable dialog overlay with Framer Motion animations,
// keyboard escape handling, and click-outside-to-close.
// ────────────────────────────────────────────────────────

import { useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    children: React.ReactNode
    footer?: React.ReactNode
}

const SIZE_CLASSES = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
}

export default function Modal({
    isOpen,
    onClose,
    title,
    description,
    size = 'md',
    children,
    footer
}: ModalProps) {
    const handleKeyDown = useCallback(
        (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        },
        [onClose]
    )

    useEffect(() => {
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown)
            document.body.style.overflow = 'hidden'
        }
        return () => {
            document.removeEventListener('keydown', handleKeyDown)
            document.body.style.overflow = ''
        }
    }, [isOpen, handleKeyDown])

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    {/* ─── Backdrop ─────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* ─── Dialog ──────────────────────────────── */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                        transition={{ duration: 0.2, ease: 'easeOut' }}
                        className={`
              relative w-full ${SIZE_CLASSES[size]} mx-4
              bg-surface-900 border border-surface-700/40
              rounded-xl shadow-glass-lg
              flex flex-col max-h-[85vh]
            `}
                    >
                        {/* ─── Header ────────────────────────────── */}
                        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-surface-800/50">
                            <div>
                                <h3 className="text-lg font-semibold text-surface-50">{title}</h3>
                                {description && (
                                    <p className="text-sm text-surface-400 mt-1">{description}</p>
                                )}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-1.5 rounded-lg text-surface-400 hover:text-surface-200
                           hover:bg-surface-800/60 transition-colors"
                            >
                                <X size={18} />
                            </button>
                        </div>

                        {/* ─── Body ──────────────────────────────── */}
                        <div className="flex-1 overflow-y-auto px-6 py-5">
                            {children}
                        </div>

                        {/* ─── Footer ────────────────────────────── */}
                        {footer && (
                            <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-surface-800/50">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
