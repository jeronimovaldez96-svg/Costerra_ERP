// ────────────────────────────────────────────────────────
// Costerra ERP — Settings Page (Full Implementation)
// Backup, Restore, Appearance, and system administration.
// ────────────────────────────────────────────────────────

import { useEffect, useState, useCallback } from 'react'
import { HardDrive, Upload, Download, Shield, Clock, Sun, Moon, Trash2, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'
import PageShell from '../../components/layout/PageShell'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useToastStore } from '../../stores/toast.store'
import { useThemeStore } from '../../stores/theme.store'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { formatDate, formatFileSize } from '../../lib/formatters'

interface BackupLog {
    id: number
    filename: string
    filePath: string
    sizeBytes: number
    createdAt: string
}

export default function SettingsPage() {
    const [backups, setBackups] = useState<BackupLog[]>([])
    const [loading, setLoading] = useState(true)
    const [backingUp, setBackingUp] = useState(false)
    const [restoreConfirm, setRestoreConfirm] = useState(false)
    const [restoring, setRestoring] = useState(false)
    const [resetConfirm, setResetConfirm] = useState(false)
    const [resetting, setResetting] = useState(false)
    const { addToast } = useToastStore()
    const { theme, toggleTheme } = useThemeStore()

    const isLightMode = theme === 'light'

    /**
     * Triggers the smooth theme transition class on <html>,
     * toggles the theme, then removes the class after animation completes.
     * This prevents the transition styles from affecting initial page loads
     * while still providing a polished toggle experience.
     */
    const handleToggleTheme = () => {
        const root = document.documentElement
        root.classList.add('theme-transition')
        toggleTheme()
        // Remove the transition class after the animation completes
        // to avoid interfering with other transitions
        setTimeout(() => root.classList.remove('theme-transition'), 350)
    }

    const fetchBackups = useCallback(async () => {
        setLoading(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.BACKUP_LIST)
            if (res.success) setBackups(res.data)
        } catch {
            // Silent — backups page may be empty
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchBackups() }, [fetchBackups])

    const handleCreateBackup = async () => {
        setBackingUp(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.BACKUP_CREATE)
            if (res.success) {
                addToast({
                    type: 'success',
                    title: 'Backup Created',
                    message: `${res.data.filename} (${formatFileSize(res.data.sizeBytes)})`,
                    duration: 5000
                })
                fetchBackups()
            } else {
                addToast({ type: 'error', title: 'Backup Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Backup Failed' })
        } finally {
            setBackingUp(false)
        }
    }

    const handleReset = async () => {
        setResetting(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.DATABASE_RESET)
            if (res.success) {
                addToast({
                    type: 'success',
                    title: 'Database Reset Complete',
                    message: 'All data has been cleared. The application will reload.',
                    duration: 6000
                })
                setTimeout(() => window.location.reload(), 3000)
            } else {
                addToast({ type: 'error', title: 'Reset Aborted', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Reset Failed' })
        } finally {
            setResetting(false)
            setResetConfirm(false)
        }
    }

    const handleRestore = async () => {
        setRestoring(true)
        try {
            const res = await window.api.invoke(IPC_CHANNELS.BACKUP_RESTORE)
            if (res.success) {
                addToast({
                    type: 'success',
                    title: 'Restore Complete',
                    message: 'Database and assets have been restored. The application will reload.',
                    duration: 6000
                })
                // Reload after a brief delay to let the toast show
                setTimeout(() => window.location.reload(), 3000)
            } else {
                addToast({ type: 'error', title: 'Restore Failed', message: res.error })
            }
        } catch {
            addToast({ type: 'error', title: 'Restore Failed' })
        } finally {
            setRestoring(false)
            setRestoreConfirm(false)
        }
    }

    return (
        <PageShell
            title="Settings"
            description="System backup, restore, and application preferences"
        >
            {/* ─── Appearance Card ─────────────────────────── */}
            <div className="glass-card p-6 mb-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400">
                            {isLightMode ? <Sun size={20} /> : <Moon size={20} />}
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-surface-100">Appearance</h3>
                            <p className="text-sm text-surface-500">
                                {isLightMode
                                    ? 'Light mode is active — switch to dark for a darker interface'
                                    : 'Dark mode is active — switch to light for a brighter interface'}
                            </p>
                        </div>
                    </div>

                    {/* ─── Toggle Switch ────────────────────── */}
                    <button
                        id="theme-toggle"
                        role="switch"
                        aria-checked={isLightMode}
                        aria-label={`Switch to ${isLightMode ? 'dark' : 'light'} mode`}
                        onClick={handleToggleTheme}
                        className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer
                            rounded-full border-2 border-transparent transition-colors duration-200
                            focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:ring-offset-2 focus:ring-offset-surface-950
                            ${isLightMode ? 'bg-brand-500' : 'bg-surface-600'}`}
                    >
                        <span className="sr-only">Toggle light mode</span>
                        <motion.span
                            layout
                            transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                            className={`pointer-events-none relative inline-block h-6 w-6 rounded-full
                                bg-white shadow-lg ring-0
                                ${isLightMode ? 'translate-x-5' : 'translate-x-0'}`}
                        >
                            {/* Icon inside the knob */}
                            <span className="absolute inset-0 flex items-center justify-center">
                                {isLightMode
                                    ? <Sun size={12} className="text-brand-500" />
                                    : <Moon size={12} className="text-surface-400" />}
                            </span>
                        </motion.span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Backup Card */}
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-brand-500/10 text-brand-400">
                            <Download size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-surface-100">Create Backup</h3>
                            <p className="text-sm text-surface-500">Download a full system backup (.zip)</p>
                        </div>
                    </div>
                    <p className="text-sm text-surface-400">
                        Creates a compressed archive of your database and all product images.
                        Write operations will be temporarily blocked during backup.
                    </p>
                    <button
                        className="btn-primary w-full"
                        onClick={handleCreateBackup}
                        disabled={backingUp}
                    >
                        <HardDrive size={16} />
                        {backingUp ? 'Creating Backup...' : 'Create Backup'}
                    </button>
                </div>

                {/* Restore Card */}
                <div className="glass-card p-6 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 rounded-lg bg-warning-500/10 text-warning-500">
                            <Upload size={20} />
                        </div>
                        <div>
                            <h3 className="text-base font-medium text-surface-100">Restore Backup</h3>
                            <p className="text-sm text-surface-500">Upload a previous backup to restore</p>
                        </div>
                    </div>
                    <p className="text-sm text-surface-400">
                        Replaces the current database and images with a previously downloaded backup.
                        The application will reload after restoration.
                    </p>
                    <button
                        className="btn-danger w-full"
                        onClick={() => setRestoreConfirm(true)}
                        disabled={restoring}
                    >
                        <Shield size={16} />
                        {restoring ? 'Restoring...' : 'Restore from Backup'}
                    </button>
                </div>
            </div>

            {/* Backup History */}
            <div className="glass-card p-6 mt-4">
                <h3 className="text-base font-medium text-surface-100 mb-4">Backup History</h3>
                {loading ? (
                    <div className="space-y-2">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex justify-between items-center p-2">
                                <div className="skeleton h-4 w-48" />
                                <div className="skeleton h-4 w-20" />
                            </div>
                        ))}
                    </div>
                ) : backups.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <div className="text-center">
                            <Clock size={20} className="mx-auto text-surface-500 mb-2" />
                            <p className="text-sm text-surface-500">No backups have been created yet.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-1">
                        {backups.map((backup) => (
                            <div
                                key={backup.id}
                                className="flex items-center justify-between p-3 rounded-lg hover:bg-surface-800/30 transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <HardDrive size={16} className="text-surface-500" />
                                    <div>
                                        <p className="text-sm text-surface-200">{backup.filename}</p>
                                        <p className="text-xs text-surface-500">{formatDate(backup.createdAt)}</p>
                                    </div>
                                </div>
                                <span className="text-xs text-surface-400">{formatFileSize(backup.sizeBytes)}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ─── Danger Zone ──────────────────────────── */}
            <div className="mt-8 border border-danger-500/30 rounded-xl overflow-hidden">
                <div className="px-6 py-3 bg-danger-500/10 border-b border-danger-500/20">
                    <div className="flex items-center gap-2">
                        <AlertTriangle size={16} className="text-danger-500" />
                        <h3 className="text-sm font-semibold text-danger-500 uppercase tracking-wide">Danger Zone</h3>
                    </div>
                </div>
                <div className="p-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-lg bg-danger-500/10 text-danger-500">
                                <Trash2 size={20} />
                            </div>
                            <div>
                                <h4 className="text-base font-medium text-surface-100">Reset Database</h4>
                                <p className="text-sm text-surface-500">
                                    Permanently delete all data — a backup will be required first
                                </p>
                            </div>
                        </div>
                        <button
                            className="btn-danger flex-shrink-0"
                            onClick={() => setResetConfirm(true)}
                            disabled={resetting}
                        >
                            <Trash2 size={16} />
                            {resetting ? 'Resetting...' : 'Reset Database'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Restore Confirmation */}
            <ConfirmDialog
                isOpen={restoreConfirm}
                onClose={() => setRestoreConfirm(false)}
                onConfirm={handleRestore}
                loading={restoring}
                title="Restore from Backup"
                message={
                    'This will REPLACE all current data (database and images) with the selected backup file. ' +
                    'Any data created after the backup was made will be permanently lost. ' +
                    'The application will reload after restoration.\n\n' +
                    'Are you sure you want to proceed?'
                }
                confirmLabel="Restore"
                variant="danger"
            />

            {/* Reset Confirmation */}
            <ConfirmDialog
                isOpen={resetConfirm}
                onClose={() => setResetConfirm(false)}
                onConfirm={handleReset}
                loading={resetting}
                title="Reset Entire Database"
                message={
                    'This will permanently DELETE all data in the system — products, suppliers, purchase orders, inventory, clients, quotes, and sales.\n\n' +
                    'Before the reset, the system will create a mandatory backup. You must save this backup file to proceed. ' +
                    'If you cancel the backup save dialog, the reset will be aborted.\n\n' +
                    'This action cannot be undone. Are you absolutely sure?'
                }
                confirmLabel="Create Backup & Reset"
                variant="danger"
            />
        </PageShell>
    )
}
