// ────────────────────────────────────────────────────────
// Costerra ERP — Sale Execution IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as saleService from '../services/sale.service'
import type { IpcResponse, SaleExecuteInput, ListParams } from '../../shared/types'

export function registerSaleHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.SALE_EXECUTE, async (_event, input: SaleExecuteInput): Promise<IpcResponse> => {
        try {
            const sale = await saleService.executeSale(input)
            return { success: true, data: sale }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.SALE_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await saleService.listSales(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.SALE_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const sale = await saleService.getSale(id)
            return { success: true, data: sale }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
