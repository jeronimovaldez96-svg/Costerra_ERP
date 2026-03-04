// ────────────────────────────────────────────────────────
// Costerra ERP — Analytics IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as analyticsService from '../services/analytics.service'
import type { IpcResponse, ListParams } from '../../shared/types'

export function registerAnalyticsHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.ANALYTICS_DASHBOARD, async (): Promise<IpcResponse> => {
        try {
            const data = await analyticsService.getDashboardData()
            return { success: true, data }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.ANALYTICS_SALES, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const data = await analyticsService.getSalesReport(params)
            return { success: true, data }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
