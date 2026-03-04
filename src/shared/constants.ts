// ────────────────────────────────────────────────────────
// Costerra ERP — Shared Constants
// Enums and app-wide constants for both Main & Renderer.
// ────────────────────────────────────────────────────────

/** Purchase Order status state machine: DRAFT → IN_TRANSIT → DELIVERED */
export const PO_STATUS = {
    DRAFT: 'DRAFT',
    IN_TRANSIT: 'IN_TRANSIT',
    DELIVERED: 'DELIVERED'
} as const
export type PoStatus = typeof PO_STATUS[keyof typeof PO_STATUS]

/** Valid PO status transitions */
export const PO_TRANSITIONS: Record<PoStatus, PoStatus[]> = {
    DRAFT: ['IN_TRANSIT'],
    IN_TRANSIT: ['DELIVERED'],
    DELIVERED: []
}

/** Sales Lead status workflow */
export const LEAD_STATUS = {
    IN_PROGRESS: 'IN_PROGRESS',
    SOLD: 'SOLD',
    NOT_SOLD: 'NOT_SOLD'
} as const
export type LeadStatus = typeof LEAD_STATUS[keyof typeof LEAD_STATUS]

/** Quote lifecycle */
export const QUOTE_STATUS = {
    DRAFT: 'DRAFT',
    SENT: 'SENT',
    SOLD: 'SOLD',
    REJECTED: 'REJECTED'
} as const
export type QuoteStatus = typeof QUOTE_STATUS[keyof typeof QUOTE_STATUS]

/** Auto-ID prefix configuration */
export const ID_PREFIXES = {
    SKU: 'SKU',
    PO: 'PO',
    CLIENT: 'CLI',
    LEAD: 'LEAD',
    QUOTE: 'QUO',
    SALE: 'SALE'
} as const

/** Application metadata */
export const APP_CONFIG = {
    APP_NAME: 'Costerra ERP',
    DB_FILENAME: 'costerra.db',
    ASSETS_DIR: 'assets',
    BACKUPS_DIR: 'backups',
    MAX_IMAGE_SIZE_MB: 5,
    SUPPORTED_IMAGE_TYPES: ['.jpg', '.jpeg', '.png', '.gif', '.webp']
} as const
