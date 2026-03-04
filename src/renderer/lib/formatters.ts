// ────────────────────────────────────────────────────────
// Costerra ERP — Utility Formatters
// Shared formatting functions for currency, dates,
// percentages, and numbers.
// ────────────────────────────────────────────────────────

/**
 * Format a number as USD currency.
 * @example formatCurrency(1234.5) → "$1,234.50"
 */
export function formatCurrency(value: number): string {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

/**
 * Format a number with commas.
 * @example formatNumber(12345) → "12,345"
 */
export function formatNumber(value: number): string {
    return new Intl.NumberFormat('en-US').format(value)
}

/**
 * Format a percentage value.
 * @example formatPercent(42.567) → "42.57%"
 */
export function formatPercent(value: number): string {
    return `${value.toFixed(2)}%`
}

/**
 * Format an ISO date string to a readable date.
 * @example formatDate("2024-03-01T12:00:00Z") → "Mar 1, 2024"
 */
export function formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    })
}

/**
 * Format an ISO date string to a readable date+time.
 * @example formatDateTime("2024-03-01T12:30:00Z") → "Mar 1, 2024 12:30 PM"
 */
export function formatDateTime(dateStr: string): string {
    return new Date(dateStr).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    })
}

/**
 * Format file size in bytes to human-readable format.
 * @example formatFileSize(1536000) → "1.46 MB"
 */
export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${units[i]}`
}
