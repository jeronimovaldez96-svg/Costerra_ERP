// ────────────────────────────────────────────────────────
// Costerra ERP — Confirmation Dialog
// Wraps Modal for simple confirm/cancel actions.
// ────────────────────────────────────────────────────────

import Modal from './Modal'

interface ConfirmDialogProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmLabel?: string
    cancelLabel?: string
    variant?: 'danger' | 'primary'
    loading?: boolean
}

export default function ConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    variant = 'primary',
    loading = false
}: ConfirmDialogProps) {
    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={title}
            size="sm"
            footer={
                <>
                    <button className="btn-ghost" onClick={onClose} disabled={loading}>
                        {cancelLabel}
                    </button>
                    <button
                        className={variant === 'danger' ? 'btn-danger' : 'btn-primary'}
                        onClick={onConfirm}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : confirmLabel}
                    </button>
                </>
            }
        >
            <p className="text-sm text-surface-300 leading-relaxed">{message}</p>
        </Modal>
    )
}
