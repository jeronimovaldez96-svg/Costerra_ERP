// ────────────────────────────────────────────────────────
// Costerra ERP — Quote IPC Handlers
// ────────────────────────────────────────────────────────

import { ipcMain, BrowserWindow, app, dialog } from 'electron'
import { join } from 'path'
import { writeFileSync } from 'fs'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as quoteService from '../services/quote.service'
import type { IpcResponse, QuoteCreateInput, QuoteLineItemInput, ListParams } from '../../shared/types'

/**
 * Formats a number as USD currency string.
 * Runs in the Main process so we cannot rely on Intl in all environments.
 */
function fmtCurrency(value: number): string {
    return '$' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

/** Formats an ISO date string to a short locale date */
function fmtDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

/**
 * Builds a complete, self-contained HTML document for the Quote PDF.
 * This runs entirely in the Main process — no React, no routing.
 */
function buildQuotePdfHtml(quote: any): string {
    const client = quote.salesLead?.client
    const lineItems = quote.lineItems || []
    const subtotal = lineItems.reduce((s: number, li: any) => s + li.lineTotal, 0)
    const totalDue = subtotal + (quote.taxAmount || 0)

    const lineItemRows = lineItems
        .map(
            (li: any, idx: number) => `
        <tr style="background:${idx % 2 === 0 ? '#f8fafc' : '#ffffff'}">
            <td style="padding:16px;border-bottom:1px solid #f1f5f9">
                <div style="font-weight:600;color:#1e293b">${li.product?.name ?? ''}</div>
                <div style="font-size:11px;color:#94a3b8;margin-top:4px;font-family:monospace;text-transform:uppercase;letter-spacing:0.05em">${li.product?.skuNumber ?? ''}</div>
            </td>
            <td style="padding:16px;text-align:center;border-bottom:1px solid #f1f5f9;color:#334155">${li.quantity}</td>
            <td style="padding:16px;text-align:right;border-bottom:1px solid #f1f5f9;color:#334155">${fmtCurrency(li.unitPrice)}</td>
            <td style="padding:16px;text-align:right;border-bottom:1px solid #f1f5f9;font-weight:500;color:#1e293b">${fmtCurrency(li.lineTotal)}</td>
        </tr>`
        )
        .join('')

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family:'Inter',system-ui,-apple-system,sans-serif; color:#1e293b; background:#fff; }
  .page { width:8.5in; margin:0 auto; padding:48px; }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:48px">
    <div>
      <h1 style="font-size:32px;font-weight:700;letter-spacing:-0.5px;color:#0f172a;margin-bottom:4px">COSTERRA</h1>
      <div style="height:4px;width:48px;background:#2563eb;margin-bottom:8px;border-radius:2px"></div>
      <p style="font-size:12px;color:#64748b;font-weight:500;letter-spacing:0.15em;text-transform:uppercase">Enterprise Resource Planning</p>
    </div>
    <div style="text-align:right">
      <h2 style="font-size:28px;font-weight:300;color:#94a3b8;text-transform:uppercase;letter-spacing:0.15em;margin-bottom:8px">Quote</h2>
      <p style="font-size:13px;font-weight:600;color:#1e293b">#${quote.quoteNumber}</p>
      <p style="font-size:11px;color:#64748b;margin-top:4px">Date: ${fmtDate(quote.createdAt)}</p>
    </div>
  </div>

  <div style="height:1px;background:#e2e8f0;margin-bottom:40px"></div>

  <!-- Info Blocks -->
  <div style="display:flex;gap:48px;margin-bottom:48px">
    <div style="flex:1">
      <h3 style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Prepared For</h3>
      <div style="background:#f8fafc;padding:16px;border-radius:6px;border:1px solid #f1f5f9">
        <p style="font-weight:600;color:#1e293b">${client?.name ?? ''} ${client?.surname ?? ''}</p>
        ${client?.address ? `<p style="font-size:13px;color:#475569;margin-top:4px">${client.address}</p>` : ''}
        ${client?.city ? `<p style="font-size:13px;color:#475569">${client.city}${client?.zipCode ? ', ' + client.zipCode : ''}</p>` : ''}
        ${client?.phone ? `<p style="font-size:13px;color:#475569;margin-top:8px">${client.phone}</p>` : ''}
      </div>
    </div>
    <div style="flex:1;border-left:1px solid #f1f5f9;padding-left:48px">
      <h3 style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:12px">Quote Details</h3>
      <table style="width:100%;font-size:13px">
        <tr><td style="padding:4px 0;color:#64748b;font-weight:500;width:130px">Lead Reference:</td><td style="padding:4px 0;color:#1e293b">${quote.salesLead?.leadNumber ?? ''}</td></tr>
        <tr><td style="padding:4px 0;color:#64748b;font-weight:500">Valid Until:</td><td style="padding:4px 0;color:#1e293b">30 days from date</td></tr>
      </table>
    </div>
  </div>

  <!-- Line Items Table -->
  <table style="width:100%;font-size:13px;margin-bottom:32px;border-collapse:collapse">
    <thead>
      <tr>
        <th style="background:#1e293b;color:#fff;padding:12px 16px;text-align:left;font-weight:600;border-radius:6px 0 0 0">Item</th>
        <th style="background:#1e293b;color:#fff;padding:12px 16px;text-align:center;font-weight:600">Qty</th>
        <th style="background:#1e293b;color:#fff;padding:12px 16px;text-align:right;font-weight:600">Unit Price</th>
        <th style="background:#1e293b;color:#fff;padding:12px 16px;text-align:right;font-weight:600;border-radius:0 6px 0 0">Total</th>
      </tr>
    </thead>
    <tbody>
      ${lineItemRows}
    </tbody>
  </table>

  <!-- Totals & Notes -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start">
    <div style="flex:1;padding-right:32px">
      ${quote.notes ? `
        <h3 style="font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:8px">Notes</h3>
        <p style="font-size:13px;color:#475569;background:#f8fafc;padding:16px;border-radius:6px;border:1px solid #f1f5f9;white-space:pre-wrap;line-height:1.6">${quote.notes}</p>
      ` : ''}
    </div>
    <div style="width:280px">
      <table style="width:100%;font-size:13px">
        <tr>
          <td style="padding:8px 0;color:#64748b;font-weight:500">Subtotal</td>
          <td style="padding:8px 0;text-align:right;font-weight:500;color:#1e293b">${fmtCurrency(subtotal)}</td>
        </tr>
        <tr style="border-bottom:1px solid #e2e8f0">
          <td style="padding:8px 0 16px;color:#64748b;font-weight:500">Tax (${quote.taxRate || 0}%)</td>
          <td style="padding:8px 0 16px;text-align:right;font-weight:500;color:#1e293b">${fmtCurrency(quote.taxAmount || 0)}</td>
        </tr>
        <tr>
          <td style="padding:16px 0;font-size:15px;font-weight:700;color:#1e293b">Total Due</td>
          <td style="padding:16px 0;text-align:right;font-size:17px;font-weight:700;color:#2563eb">${fmtCurrency(totalDue)}</td>
        </tr>
      </table>
    </div>
  </div>

  <div style="margin-top:80px;padding-top:32px;border-top:1px solid #e2e8f0;text-align:center">
    <p style="font-size:11px;color:#94a3b8;font-weight:500">Thank you for your business.</p>
  </div>
</div>
</body>
</html>`
}

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
     * Generates a professionally formatted Quote PDF and saves it to a user-designated location.
     * Uses server-side HTML generation to avoid React routing issues with hidden windows.
     */
    ipcMain.handle(IPC_CHANNELS.QUOTE_PRINT_PDF, async (event, quoteId: number): Promise<IpcResponse> => {
        let printWin: BrowserWindow | null = null
        try {
            // Fetch quote with all related data
            const quote = await quoteService.getQuote(quoteId)
            const safeQuoteNumber = quote.quoteNumber.replace(/[^a-zA-Z0-9-_]/g, '')
            const defaultFileName = `Costerra-Quote-${safeQuoteNumber}.pdf`

            // Prompt user for save location FIRST to avoid unnecessary rendering
            const mainWindow = BrowserWindow.fromWebContents(event.sender)
            const saveDialogResult = await dialog.showSaveDialog(mainWindow!, {
                title: 'Save Quote PDF',
                defaultPath: join(app.getPath('desktop'), defaultFileName),
                filters: [{ name: 'PDF Documents', extensions: ['pdf'] }]
            })

            if (saveDialogResult.canceled || !saveDialogResult.filePath) {
                return { success: false, error: 'Save cancelled by user' }
            }

            // Create a hidden browser window for PDF rendering
            printWin = new BrowserWindow({
                show: false,
                width: 816,
                height: 1056,
                webPreferences: {
                    nodeIntegration: false,
                    contextIsolation: true
                }
            })

            // Build a self-contained HTML document from the quote data
            const html = buildQuotePdfHtml(quote)

            // Load the HTML directly — no React routing dependency
            await printWin.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(html)}`)

            // Small delay to let fonts load and CSS render
            await new Promise((resolve) => setTimeout(resolve, 500))

            // Generate PDF from the hidden window
            const pdfData = await printWin.webContents.printToPDF({
                printBackground: true,
                landscape: false,
                pageSize: 'Letter',
                margins: { marginType: 'custom', top: 0, bottom: 0, left: 0, right: 0 }
            })

            // Save to the selected path
            writeFileSync(saveDialogResult.filePath, pdfData)

            return { success: true, data: { filePath: saveDialogResult.filePath, fileName: defaultFileName } }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        } finally {
            if (printWin && !printWin.isDestroyed()) printWin.close()
        }
    })
}

