// ────────────────────────────────────────────────────────
// Costerra ERP — IPC Handler Registry
// Aggregates and registers all module-specific IPC handlers.
// Called once during app startup in main/index.ts.
// ────────────────────────────────────────────────────────

import { registerProductHandlers } from './product.ipc'
import { registerSupplierHandlers } from './supplier.ipc'
import { registerPurchaseOrderHandlers } from './purchase-order.ipc'
import { registerInventoryHandlers } from './inventory.ipc'
import { registerClientHandlers } from './client.ipc'
import { registerSalesLeadHandlers } from './sales-lead.ipc'
import { registerQuoteHandlers } from './quote.ipc'
import { registerSaleHandlers } from './sale.ipc'
import { registerAnalyticsHandlers } from './analytics.ipc'
import { registerBackupHandlers } from './backup.ipc'
import { registerSystemHandlers } from './system.ipc'
import { registerUpdaterHandlers } from './updater.ipc'

/**
 * Registers all IPC handlers for every module.
 * Each module's handler file calls `ipcMain.handle()` for its channels.
 */
export function registerAllIpcHandlers(): void {
    registerProductHandlers()
    registerSupplierHandlers()
    registerPurchaseOrderHandlers()
    registerInventoryHandlers()
    registerClientHandlers()
    registerSalesLeadHandlers()
    registerQuoteHandlers()
    registerSaleHandlers()
    registerAnalyticsHandlers()
    registerBackupHandlers()
    registerSystemHandlers()
    registerUpdaterHandlers()
}
