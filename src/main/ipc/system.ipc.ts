// ────────────────────────────────────────────────────────
// Costerra ERP — System IPC Handlers
// Generic system utilities (XLSX export, app paths, etc.)
// ────────────────────────────────────────────────────────

import { ipcMain, app, dialog } from 'electron'
import { writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as XLSX from 'xlsx'
import type { IpcResponse } from '../../shared/types'

export function registerSystemHandlers(): void {
    /** Export array data to .xlsx and prompt user for save location */
    ipcMain.handle(IPC_CHANNELS.EXPORT_XLSX, async (_event, data: Record<string, unknown>[], filename: string): Promise<IpcResponse> => {
        try {
            const result = await dialog.showSaveDialog({
                title: 'Export to Excel',
                defaultPath: filename,
                filters: [{ name: 'Excel Files', extensions: ['xlsx'] }]
            })

            if (result.canceled || !result.filePath) {
                return { success: false, error: 'Export cancelled by user' }
            }

            const worksheet = XLSX.utils.json_to_sheet(data)
            const workbook = XLSX.utils.book_new()
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Data')
            const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })
            writeFileSync(result.filePath, buffer)

            return { success: true, data: { filePath: result.filePath } }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    /** Returns the app's userData path for the renderer to reference */
    ipcMain.handle(IPC_CHANNELS.GET_APP_PATH, async (): Promise<IpcResponse> => {
        try {
            return { success: true, data: app.getPath('userData') }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
