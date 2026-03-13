// ────────────────────────────────────────────────────────
// Costerra ERP — Searchable Select (Combobox)
// A type-ahead input that filters a list of options by
// partial, case-insensitive match and renders a floating
// dropdown of results.
// ────────────────────────────────────────────────────────

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { ChevronDown, X } from 'lucide-react'

export interface SearchableOption {
    /** Unique identifier (usually the DB primary-key) */
    value: number
    /** The display string shown in the dropdown and input */
    label: string
}

interface SearchableSelectProps {
    /** Full list of available options */
    options: SearchableOption[]
    /** Currently selected value (0 = nothing selected) */
    value: number
    /** Callback when the user selects an option */
    onChange: (value: number) => void
    /** Placeholder text for the input */
    placeholder?: string
    /** Optional additional CSS class on the container */
    className?: string
}

/**
 * SearchableSelect — a combobox-style dropdown that supports:
 * - Free-text filtering with partial, case-insensitive matching
 * - Keyboard navigation (Arrow Up/Down, Enter, Escape)
 * - Click-outside to close
 * - Clear button to deselect
 */
export default function SearchableSelect({
    options,
    value,
    onChange,
    placeholder = 'Search...',
    className = ''
}: SearchableSelectProps) {
    const [query, setQuery] = useState('')
    const [open, setOpen] = useState(false)
    const [highlightIndex, setHighlightIndex] = useState(0)

    const containerRef = useRef<HTMLDivElement>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const listRef = useRef<HTMLUListElement>(null)

    // ─── Derive the selected option's label ────────────
    const selectedOption = useMemo(
        () => options.find((o) => o.value === value) ?? null,
        [options, value]
    )

    // ─── Filter options by query ───────────────────────
    const filtered = useMemo(() => {
        if (!query) return options
        const lowerQ = query.toLowerCase()
        return options.filter((o) => o.label.toLowerCase().includes(lowerQ))
    }, [options, query])

    // Reset highlight when filtered list changes
    useEffect(() => {
        setHighlightIndex(0)
    }, [filtered.length])

    // ─── Click-outside handler ─────────────────────────
    useEffect(() => {
        function handleClickOutside(e: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // ─── Scroll the highlighted item into view ─────────
    useEffect(() => {
        if (!open || !listRef.current) return
        const item = listRef.current.children[highlightIndex] as HTMLLIElement | undefined
        item?.scrollIntoView({ block: 'nearest' })
    }, [highlightIndex, open])

    // ─── Select an option ──────────────────────────────
    const selectOption = useCallback(
        (opt: SearchableOption) => {
            onChange(opt.value)
            setQuery('')
            setOpen(false)
        },
        [onChange]
    )

    // ─── Clear selection ───────────────────────────────
    const clearSelection = useCallback(
        (e: React.MouseEvent) => {
            e.stopPropagation()
            onChange(0)
            setQuery('')
            inputRef.current?.focus()
        },
        [onChange]
    )

    // ─── Keyboard navigation ──────────────────────────
    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            if (!open) {
                if (e.key === 'ArrowDown' || e.key === 'Enter') {
                    e.preventDefault()
                    setOpen(true)
                }
                return
            }

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault()
                    setHighlightIndex((prev) => Math.min(prev + 1, filtered.length - 1))
                    break
                case 'ArrowUp':
                    e.preventDefault()
                    setHighlightIndex((prev) => Math.max(prev - 1, 0))
                    break
                case 'Enter':
                    e.preventDefault()
                    if (filtered[highlightIndex]) {
                        selectOption(filtered[highlightIndex])
                    }
                    break
                case 'Escape':
                    e.preventDefault()
                    setOpen(false)
                    break
            }
        },
        [open, filtered, highlightIndex, selectOption]
    )

    // ─── Input display value ──────────────────────────
    const displayValue = open || query ? query : selectedOption?.label ?? ''

    return (
        <div ref={containerRef} className={`relative ${className}`}>
            {/* ─── Input ─────────────────────────────────── */}
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={displayValue}
                    placeholder={selectedOption ? selectedOption.label : placeholder}
                    onChange={(e) => {
                        setQuery(e.target.value)
                        if (!open) setOpen(true)
                    }}
                    onFocus={() => {
                        setOpen(true)
                        setQuery('')
                    }}
                    onKeyDown={handleKeyDown}
                    className="input-base pr-16"
                    autoComplete="off"
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                    {selectedOption && (
                        <button
                            type="button"
                            onClick={clearSelection}
                            className="p-0.5 rounded hover:bg-surface-700/60 text-surface-500 hover:text-surface-300 transition-colors"
                            tabIndex={-1}
                        >
                            <X size={14} />
                        </button>
                    )}
                    <ChevronDown
                        size={14}
                        className={`text-surface-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                    />
                </div>
            </div>

            {/* ─── Dropdown ──────────────────────────────── */}
            {open && (
                <ul
                    ref={listRef}
                    className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-lg
                               border border-surface-700/40 bg-surface-900/95 backdrop-blur-xl
                               shadow-xl shadow-black/30 py-1"
                >
                    {filtered.length === 0 ? (
                        <li className="px-3 py-2 text-xs text-surface-500 text-center">
                            No matches found
                        </li>
                    ) : (
                        filtered.map((opt, idx) => (
                            <li
                                key={opt.value}
                                onMouseDown={(e) => {
                                    e.preventDefault()
                                    selectOption(opt)
                                }}
                                onMouseEnter={() => setHighlightIndex(idx)}
                                className={`px-3 py-2 text-sm cursor-pointer transition-colors
                                    ${idx === highlightIndex
                                        ? 'bg-brand-500/15 text-brand-300'
                                        : 'text-surface-300 hover:bg-surface-800/60'
                                    }
                                    ${opt.value === value ? 'font-medium' : ''}
                                `}
                            >
                                {opt.label}
                            </li>
                        ))
                    )}
                </ul>
            )}
        </div>
    )
}
