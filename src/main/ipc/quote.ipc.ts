// ────────────────────────────────────────────────────────
// Costerra ERP — Quote IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain, BrowserWindow, app } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as quoteService from '../services/quote.service'
import type { IpcResponse, QuoteCreateInput, QuoteLineItemInput, ListParams } from '../../shared/types'

export function registerQuoteHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.QUOTE_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await quoteService.listQuotes(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.QUOTE_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const quote = await quoteService.getQuote(id)
            return { success: true, data: quote }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.QUOTE_CREATE, async (_event, input: QuoteCreateInput): Promise<IpcResponse> => {
        try {
            const quote = await quoteService.createQuote(input)
            return { success: true, data: quote }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.QUOTE_UPDATE, async (_event, id: number, data: { notes?: string; status?: string }): Promise<IpcResponse> => {
        try {
            const quote = await quoteService.updateQuote(id, data)
            return { success: true, data: quote }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.QUOTE_ADD_LINE_ITEM, async (_event, input: QuoteLineItemInput): Promise<IpcResponse> => {
        try {
            const item = await quoteService.addLineItem(input)
            return { success: true, data: item }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.QUOTE_REMOVE_LINE_ITEM, async (_event, lineItemId: number): Promise<IpcResponse> => {
        try {
            await quoteService.removeLineItem(lineItemId)
            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    /**
     * Generates a PDF of the current page view and saves it to the user's Desktop.
     * File naming: Costerra-Quote-{quoteNumber}.pdf
     */
    ipcMain.handle(IPC_CHANNELS.QUOTE_PRINT_PDF, async (event, quoteId: number): Promise<IpcResponse> => {
        try {
            const win = BrowserWindow.fromWebContents(event.sender)
            if (!win) throw new Error('No browser window found')

            // Fetch quote to build a descriptive filename
            const quote = await quoteService.getQuote(quoteId)
            const safeQuoteNumber = quote.quoteNumber.replace(/[^a-zA-Z0-9-_]/g, '')
            const fileName = `Costerra-Quote-${safeQuoteNumber}.pdf`

            // Generate PDF buffer from the current page
            const pdfData = await win.webContents.printToPDF({
                printBackground: true,
                landscape: false,
                margins: { marginType: 'custom', top: 0.4, bottom: 0.4, left: 0.4, right: 0.4 }
            })

            // Save to the user's Desktop
            const desktopPath = app.getPath('desktop')
            const filePath = join(desktopPath, fileName)
            writeFileSync(filePath, pdfData)

            return { success: true, data: { filePath, fileName } }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}

