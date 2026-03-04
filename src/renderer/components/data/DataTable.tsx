// ────────────────────────────────────────────────────────
// Costerra ERP — DataTable Component
// Reusable, sortable, filterable, paginated data table
// built on TanStack Table v8.
// Supports XLSX export via IPC.
// ────────────────────────────────────────────────────────

import { useState, useMemo } from 'react'
import {
    useReactTable,
    getCoreRowModel,
    getSortedRowModel,
    getFilteredRowModel,
    getPaginationRowModel,
    flexRender,
    type ColumnDef,
    type SortingState,
    type ColumnFiltersState
} from '@tanstack/react-table'
import { motion } from 'framer-motion'
import {
    ChevronUp,
    ChevronDown,
    ChevronsUpDown,
    ChevronLeft,
    ChevronRight,
    Search,
    Download
} from 'lucide-react'
import { IPC_CHANNELS } from '@shared/ipc-channels'
import { useToastStore } from '../../stores/toast.store'

interface DataTableProps<T> {
    data: T[]
    columns: ColumnDef<T, unknown>[]
    searchPlaceholder?: string
    exportFilename?: string
    /** Optional columns to use for XLSX export (defaults to column accessors) */
    exportColumns?: Array<{ header: string; accessor: string }>
    pageSize?: number
    onRowClick?: (row: T) => void
    emptyIcon?: React.ReactNode
    emptyTitle?: string
    emptyMessage?: string
    loading?: boolean
}

export default function DataTable<T extends Record<string, unknown>>({
    data,
    columns,
    searchPlaceholder = 'Search...',
    exportFilename,
    exportColumns,
    pageSize = 25,
    onRowClick,
    emptyIcon,
    emptyTitle = 'No Data',
    emptyMessage = 'No records found.',
    loading = false
}: DataTableProps<T>) {
    const [sorting, setSorting] = useState<SortingState>([])
    const [globalFilter, setGlobalFilter] = useState('')
    const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
    const { addToast } = useToastStore()

    const table = useReactTable({
        data,
        columns,
        state: { sorting, globalFilter, columnFilters },
        onSortingChange: setSorting,
        onGlobalFilterChange: setGlobalFilter,
        onColumnFiltersChange: setColumnFilters,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        initialState: { pagination: { pageSize } }
    })

    const handleExport = async () => {
        if (!exportFilename) return

        try {
            const rows = table.getFilteredRowModel().rows
            const exportData = rows.map((row) => {
                const obj: Record<string, unknown> = {}
                if (exportColumns) {
                    for (const col of exportColumns) {
                        obj[col.header] = row.original[col.accessor]
                    }
                } else {
                    for (const col of columns) {
                        const accessorKey = (col as { accessorKey?: string }).accessorKey
                        const header = typeof col.header === 'string' ? col.header : accessorKey
                        if (accessorKey && header) {
                            obj[header] = row.original[accessorKey]
                        }
                    }
                }
                return obj
            })

            await window.api.invoke(IPC_CHANNELS.EXPORT_XLSX, exportData, exportFilename)
            addToast({ type: 'success', title: 'Export Complete', message: `Saved ${rows.length} rows` })
        } catch {
            addToast({ type: 'error', title: 'Export Failed', message: 'Could not export data' })
        }
    }

    const pageIndex = table.getState().pagination.pageIndex
    const totalPages = table.getPageCount()
    const totalRows = table.getFilteredRowModel().rows.length

    return (
        <div className="glass-card overflow-hidden">
            {/* ─── Toolbar ──────────────────────────────────── */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-surface-800/50">
                <div className="relative w-64">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-surface-500" />
                    <input
                        type="text"
                        value={globalFilter}
                        onChange={(e) => setGlobalFilter(e.target.value)}
                        placeholder={searchPlaceholder}
                        className="input-base pl-9 py-1.5 text-sm"
                    />
                </div>

                <div className="flex items-center gap-2">
                    <span className="text-xs text-surface-500">
                        {totalRows} {totalRows === 1 ? 'record' : 'records'}
                    </span>
                    {exportFilename && (
                        <button onClick={handleExport} className="btn-ghost text-xs py-1.5">
                            <Download size={14} />
                            Export
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Table ────────────────────────────────────── */}
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        {table.getHeaderGroups().map((headerGroup) => (
                            <tr key={headerGroup.id} className="border-b border-surface-800/50">
                                {headerGroup.headers.map((header) => (
                                    <th
                                        key={header.id}
                                        className="px-4 py-3 text-left text-xs font-medium text-surface-400 uppercase tracking-wider"
                                    >
                                        {header.isPlaceholder ? null : (
                                            <button
                                                className={`flex items-center gap-1 ${header.column.getCanSort() ? 'cursor-pointer select-none hover:text-surface-200' : ''
                                                    }`}
                                                onClick={header.column.getToggleSortingHandler()}
                                            >
                                                {flexRender(header.column.columnDef.header, header.getContext())}
                                                {header.column.getCanSort() && (
                                                    <span className="ml-1">
                                                        {{
                                                            asc: <ChevronUp size={12} />,
                                                            desc: <ChevronDown size={12} />
                                                        }[header.column.getIsSorted() as string] ?? <ChevronsUpDown size={12} className="text-surface-600" />}
                                                    </span>
                                                )}
                                            </button>
                                        )}
                                    </th>
                                ))}
                            </tr>
                        ))}
                    </thead>
                    <tbody>
                        {loading ? (
                            // Skeleton rows
                            Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skel-${i}`} className="border-b border-surface-800/30">
                                    {columns.map((_, ci) => (
                                        <td key={ci} className="px-4 py-3">
                                            <div className="skeleton h-4 w-24 rounded" />
                                        </td>
                                    ))}
                                </tr>
                            ))
                        ) : table.getRowModel().rows.length === 0 ? (
                            // Empty state
                            <tr>
                                <td colSpan={columns.length} className="px-4 py-16 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        {emptyIcon && (
                                            <div className="w-12 h-12 rounded-xl bg-surface-800/60 flex items-center justify-center">
                                                {emptyIcon}
                                            </div>
                                        )}
                                        <div>
                                            <p className="text-sm font-medium text-surface-300">{emptyTitle}</p>
                                            <p className="text-xs text-surface-500 mt-1">{emptyMessage}</p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        ) : (
                            table.getRowModel().rows.map((row) => (
                                <motion.tr
                                    key={row.id}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className={`table-row-hover border-b border-surface-800/30 ${onRowClick ? 'cursor-pointer' : ''
                                        }`}
                                    onClick={() => onRowClick?.(row.original)}
                                >
                                    {row.getVisibleCells().map((cell) => (
                                        <td key={cell.id} className="px-4 py-3 text-sm text-surface-200">
                                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                                        </td>
                                    ))}
                                </motion.tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {/* ─── Pagination ───────────────────────────────── */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-surface-800/50">
                    <span className="text-xs text-surface-500">
                        Page {pageIndex + 1} of {totalPages}
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => table.previousPage()}
                            disabled={!table.getCanPreviousPage()}
                            className="btn-ghost p-1.5 disabled:opacity-30"
                        >
                            <ChevronLeft size={16} />
                        </button>
                        <button
                            onClick={() => table.nextPage()}
                            disabled={!table.getCanNextPage()}
                            className="btn-ghost p-1.5 disabled:opacity-30"
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
