// ────────────────────────────────────────────────────────
// Costerra ERP — Preload Script (Context Bridge)
// Exposes a strictly typed API to the Renderer process.
// This is the ONLY surface area between Main and Renderer.
// ────────────────────────────────────────────────────────

import { contextBridge, ipcRenderer } from 'electron'
import type { IpcChannel } from '../shared/ipc-channels'

/**
 * The API exposed to the renderer via `window.api`.
 * Each method invokes a typed IPC channel and returns a Promise.
 */
const api = {
    /**
     * Generic invoke — sends to Main and returns the result.
     * All renderer hooks should use this as the transport layer.
     */
    invoke: <T = unknown>(channel: IpcChannel, ...args: unknown[]): Promise<T> => {
        return ipcRenderer.invoke(channel, ...args) as Promise<T>
    },

    /**
     * Listen for events pushed from Main to Renderer.
     * Used for backup progress, async notifications, etc.
     */
    on: (channel: string, callback: (...args: unknown[]) => void): void => {
        ipcRenderer.on(channel, (_event, ...args) => callback(...args))
    },

    /**
     * Remove a listener from an event channel.
     */
    off: (channel: string, callback: (...args: unknown[]) => void): void => {
        ipcRenderer.removeListener(channel, callback)
    }
}

// Expose the API on `window.api` with full type safety
contextBridge.exposeInMainWorld('api', api)

// ─── Type Augmentation ───────────────────────────────
// This ensures `window.api` is typed in the renderer process.
export type ElectronAPI = typeof api
