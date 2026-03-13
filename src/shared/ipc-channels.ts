// ────────────────────────────────────────────────────────
// Costerra ERP — Shared IPC Channel Constants
// Single source of truth for all Main ↔ Renderer comms.
// ────────────────────────────────────────────────────────

export const IPC_CHANNELS = {
    // ─── Product ───────────────────────────────────────
    PRODUCT_LIST: 'product:list',
    PRODUCT_GET: 'product:get',
    PRODUCT_CREATE: 'product:create',
    PRODUCT_UPDATE: 'product:update',
    PRODUCT_TOGGLE_ACTIVE: 'product:toggle-active',
    PRODUCT_HISTORY: 'product:history',

    // ─── Supplier ──────────────────────────────────────
    SUPPLIER_LIST: 'supplier:list',
    SUPPLIER_GET: 'supplier:get',
    SUPPLIER_CREATE: 'supplier:create',
    SUPPLIER_UPDATE: 'supplier:update',
    SUPPLIER_HISTORY: 'supplier:history',

    // ─── Purchase Order ────────────────────────────────
    PO_LIST: 'po:list',
    PO_GET: 'po:get',
    PO_CREATE: 'po:create',
    PO_UPDATE_STATUS: 'po:update-status',

    // ─── Inventory ─────────────────────────────────────
    INVENTORY_LIST: 'inventory:list',
    INVENTORY_BY_PRODUCT: 'inventory:by-product',
    INVENTORY_SUMMARY: 'inventory:summary',

    // ─── Client ────────────────────────────────────────
    CLIENT_LIST: 'client:list',
    CLIENT_GET: 'client:get',
    CLIENT_CREATE: 'client:create',
    CLIENT_UPDATE: 'client:update',
    CLIENT_HISTORY: 'client:history',
    CLIENT_REPORT: 'client:report',

    // ─── Sales Lead ────────────────────────────────────
    LEAD_LIST: 'lead:list',
    LEAD_GET: 'lead:get',
    LEAD_CREATE: 'lead:create',
    LEAD_UPDATE_STATUS: 'lead:update-status',

    // ─── Quote ─────────────────────────────────────────
    QUOTE_LIST: 'quote:list',
    QUOTE_GET: 'quote:get',
    QUOTE_CREATE: 'quote:create',
    QUOTE_UPDATE: 'quote:update',
    QUOTE_ADD_LINE_ITEM: 'quote:add-line-item',
    QUOTE_REMOVE_LINE_ITEM: 'quote:remove-line-item',
    QUOTE_PRINT_PDF: 'quote:print-pdf',

    // ─── Sale ──────────────────────────────────────────
    SALE_EXECUTE: 'sale:execute',
    SALE_LIST: 'sale:list',
    SALE_GET: 'sale:get',

    // ─── Analytics ─────────────────────────────────────
    ANALYTICS_DASHBOARD: 'analytics:dashboard',
    ANALYTICS_SALES: 'analytics:sales',

    // ─── Backup ────────────────────────────────────────
    BACKUP_CREATE: 'backup:create',
    BACKUP_RESTORE: 'backup:restore',
    BACKUP_LIST: 'backup:list',

    // ─── System ────────────────────────────────────────
    EXPORT_XLSX: 'system:export-xlsx',
    GET_APP_PATH: 'system:get-app-path',
    DATABASE_RESET: 'system:database-reset'
} as const

export type IpcChannel = typeof IPC_CHANNELS[keyof typeof IPC_CHANNELS]
