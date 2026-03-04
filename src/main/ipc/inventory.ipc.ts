// ────────────────────────────────────────────────────────
// Costerra ERP — Inventory IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as inventoryService from '../services/inventory.service'
import type { IpcResponse, ListParams } from '../../shared/types'

export function registerInventoryHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.INVENTORY_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await inventoryService.listInventory(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.INVENTORY_BY_PRODUCT, async (_event, productId: number): Promise<IpcResponse> => {
        try {
            const batches = await inventoryService.getBatchesByProduct(productId)
            return { success: true, data: batches }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.INVENTORY_SUMMARY, async (): Promise<IpcResponse> => {
        try {
            const summary = await inventoryService.getInventorySummary()
            return { success: true, data: summary }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
