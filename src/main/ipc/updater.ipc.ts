// ────────────────────────────────────────────────────────
// Costerra ERP — Updater IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as updaterService from '../services/updater.service'
import type { IpcResponse } from '../../shared/types'

export function registerUpdaterHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.UPDATE_CHECK, async (): Promise<IpcResponse> => {
        try {
            await updaterService.checkForUpdates()
            return { success: true, data: null }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.UPDATE_DOWNLOAD, async (): Promise<IpcResponse> => {
        try {
            await updaterService.downloadUpdate()
            return { success: true, data: null }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.UPDATE_INSTALL, async (): Promise<IpcResponse> => {
        try {
            updaterService.installUpdate()
            return { success: true, data: null }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
