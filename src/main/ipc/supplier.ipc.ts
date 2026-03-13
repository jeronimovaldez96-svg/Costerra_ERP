// ────────────────────────────────────────────────────────
// Costerra ERP — Supplier IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as supplierService from '../services/supplier.service'
import type { IpcResponse, SupplierCreateInput, SupplierUpdateInput, ListParams } from '../../shared/types'

export function registerSupplierHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.SUPPLIER_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await supplierService.listSuppliers(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.SUPPLIER_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const supplier = await supplierService.getSupplier(id)
            return { success: true, data: supplier }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.SUPPLIER_CREATE, async (_event, input: SupplierCreateInput): Promise<IpcResponse> => {
        try {
            const supplier = await supplierService.createSupplier(input)
            return { success: true, data: supplier }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.SUPPLIER_UPDATE, async (_event, input: SupplierUpdateInput): Promise<IpcResponse> => {
        try {
            const supplier = await supplierService.updateSupplier(input)
            return { success: true, data: supplier }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.SUPPLIER_HISTORY, async (_event, supplierId: number): Promise<IpcResponse> => {
        try {
            const history = await supplierService.getSupplierHistory(supplierId)
            return { success: true, data: history }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
