// ────────────────────────────────────────────────────────
// Costerra ERP — useIPC Hook
// Type-safe wrapper around window.api.invoke for the
// renderer process. Handles loading/error states.
// ────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import type { IpcChannel } from '@shared/ipc-channels'
import type { IpcResponse } from '@shared/types'

interface UseIpcOptions {
    /** If true, don't reset error state on new calls */
    keepPreviousError?: boolean
}

interface UseIpcReturn<T> {
    data: T | null
    loading: boolean
    error: string | null
    invoke: (...args: unknown[]) => Promise<T | null>
    reset: () => void
}

/**
 * Generic hook for invoking IPC channels with automatic
 * loading/error state management.
 *
 * @param channel - The IPC channel to invoke
 * @param options - Optional configuration
 *
 * @example
 * const { data, loading, error, invoke } = useIPC<ProductData[]>('product:list')
 * useEffect(() => { invoke({ page: 1 }) }, [])
 */
export function useIPC<T = unknown>(
    channel: IpcChannel,
    options: UseIpcOptions = {}
): UseIpcReturn<T> {
    const [data, setData] = useState<T | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const invoke = useCallback(
        async (...args: unknown[]): Promise<T | null> => {
            setLoading(true)
            if (!options.keepPreviousError) setError(null)

            try {
                const response: IpcResponse<T> = await window.api.invoke(channel, ...args)

                if (!response.success) {
                    setError(response.error || 'An unknown error occurred')
                    setData(null)
                    return null
                }

                setData(response.data as T)
                return response.data as T
            } catch (err) {
                const message = err instanceof Error ? err.message : 'IPC call failed'
                setError(message)
                setData(null)
                return null
            } finally {
                setLoading(false)
            }
        },
        [channel, options.keepPreviousError]
    )

    const reset = useCallback(() => {
        setData(null)
        setError(null)
        setLoading(false)
    }, [])

    return { data, loading, error, invoke, reset }
}
