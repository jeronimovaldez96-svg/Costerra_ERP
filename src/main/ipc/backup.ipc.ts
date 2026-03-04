// ────────────────────────────────────────────────────────
// Costerra ERP — Backup & Reset IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain, dialog, app } from 'electron'
import { join } from 'path'
import { copyFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as backupService from '../services/backup.service'
import type { IpcResponse } from '../../shared/types'

export function registerBackupHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.BACKUP_CREATE, async (): Promise<IpcResponse> => {
        try {
            const result = await backupService.createBackup()

            // Present a Save As dialog so the user can store a visible copy
            // (the internal backup in userData/backups is preserved for restore)
            const desktopPath = app.getPath('desktop')
            const saveResult = await dialog.showSaveDialog({
                title: 'Save Backup File',
                defaultPath: join(desktopPath, result.filename),
                filters: [{ name: 'Backup Files', extensions: ['zip'] }]
            })

            if (!saveResult.canceled && saveResult.filePath) {
                copyFileSync(result.filePath, saveResult.filePath)
            }

            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.BACKUP_RESTORE, async (): Promise<IpcResponse> => {
        try {
            // Open file dialog for the user to select a backup .zip
            const result = await dialog.showOpenDialog({
                title: 'Select Backup File',
                filters: [{ name: 'Backup Files', extensions: ['zip'] }],
                properties: ['openFile']
            })

            if (result.canceled || result.filePaths.length === 0) {
                return { success: false, error: 'Restore cancelled by user' }
            }

            await backupService.restoreBackup(result.filePaths[0])
            return { success: true, data: { message: 'Backup restored successfully. The application will reload.' } }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.BACKUP_LIST, async (): Promise<IpcResponse> => {
        try {
            const logs = await backupService.listBackups()
            return { success: true, data: logs }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    // ─── Database Reset (enforces backup first) ──────
    ipcMain.handle(IPC_CHANNELS.DATABASE_RESET, async (): Promise<IpcResponse> => {
        try {
            // Step 1: Force a full backup before reset
            const backupResult = await backupService.createBackup()

            // Step 2: Present Save As dialog — user MUST save the backup
            const desktopPath = app.getPath('desktop')
            const saveResult = await dialog.showSaveDialog({
                title: 'Save Mandatory Backup Before Reset',
                defaultPath: join(desktopPath, backupResult.filename),
                filters: [{ name: 'Backup Files', extensions: ['zip'] }]
            })

            if (saveResult.canceled || !saveResult.filePath) {
                return {
                    success: false,
                    error: 'Database reset aborted — you must save the backup file before the system can be reset.'
                }
            }

            copyFileSync(backupResult.filePath, saveResult.filePath)

            // Step 3: Backup confirmed saved — proceed with reset
            await backupService.resetDatabase()

            return {
                success: true,
                data: { message: 'Database has been reset. The application will reload.' }
            }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
