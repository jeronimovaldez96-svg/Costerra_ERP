// ────────────────────────────────────────────────────────
// Costerra ERP — Purchase Order IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as poService from '../services/purchase-order.service'
import type { IpcResponse, PurchaseOrderCreateInput, ListParams } from '../../shared/types'
import type { PoStatus } from '../../shared/constants'

export function registerPurchaseOrderHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.PO_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await poService.listPurchaseOrders(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PO_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const po = await poService.getPurchaseOrder(id)
            return { success: true, data: po }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PO_CREATE, async (_event, input: PurchaseOrderCreateInput): Promise<IpcResponse> => {
        try {
            const po = await poService.createPurchaseOrder(input)
            return { success: true, data: po }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PO_UPDATE_STATUS, async (_event, id: number, newStatus: PoStatus): Promise<IpcResponse> => {
        try {
            const po = await poService.updatePurchaseOrderStatus(id, newStatus)
            return { success: true, data: po }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
