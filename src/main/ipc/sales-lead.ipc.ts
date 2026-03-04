// ────────────────────────────────────────────────────────
// Costerra ERP — Sales Lead IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as leadService from '../services/sales-lead.service'
import type { IpcResponse, SalesLeadCreateInput, ListParams } from '../../shared/types'
import type { LeadStatus } from '../../shared/constants'

export function registerSalesLeadHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.LEAD_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await leadService.listLeads(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.LEAD_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const lead = await leadService.getLead(id)
            return { success: true, data: lead }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.LEAD_CREATE, async (_event, input: SalesLeadCreateInput): Promise<IpcResponse> => {
        try {
            const lead = await leadService.createLead(input)
            return { success: true, data: lead }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.LEAD_UPDATE_STATUS, async (_event, id: number, newStatus: LeadStatus): Promise<IpcResponse> => {
        try {
            const lead = await leadService.updateLeadStatus(id, newStatus)
            return { success: true, data: lead }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
