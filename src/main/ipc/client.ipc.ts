// ────────────────────────────────────────────────────────
// Costerra ERP — Client IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as clientService from '../services/client.service'
import type { IpcResponse, ClientCreateInput, ClientUpdateInput, ListParams } from '../../shared/types'

export function registerClientHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.CLIENT_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await clientService.listClients(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CLIENT_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const client = await clientService.getClient(id)
            return { success: true, data: client }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CLIENT_CREATE, async (_event, input: ClientCreateInput): Promise<IpcResponse> => {
        try {
            const client = await clientService.createClient(input)
            return { success: true, data: client }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CLIENT_UPDATE, async (_event, input: ClientUpdateInput): Promise<IpcResponse> => {
        try {
            const client = await clientService.updateClient(input)
            return { success: true, data: client }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CLIENT_HISTORY, async (_event, clientId: number): Promise<IpcResponse> => {
        try {
            const history = await clientService.getClientHistory(clientId)
            return { success: true, data: history }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.CLIENT_REPORT, async (_event, clientId: number): Promise<IpcResponse> => {
        try {
            const report = await clientService.getClientReport(clientId)
            return { success: true, data: report }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
