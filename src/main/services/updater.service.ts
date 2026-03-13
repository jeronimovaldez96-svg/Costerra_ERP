// ────────────────────────────────────────────────────────
// Costerra ERP — Updater Service
// Wraps electron-updater to provide a controlled, user-
// initiated update flow: check → download → install.
// Pushes lifecycle events to the renderer via IPC.
// ────────────────────────────────────────────────────────

import { autoUpdater, type UpdateInfo, type ProgressInfo } from 'electron-updater'
import { BrowserWindow } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'

/** Update lifecycle states pushed to the renderer */
export type UpdateStatus =
    | { state: 'checking' }
    | { state: 'available'; version: string; releaseDate: string }
    | { state: 'not-available'; version: string }
    | { state: 'downloading'; percent: number; bytesPerSecond: number; transferred: number; total: number }
    | { state: 'downloaded'; version: string }
    | { state: 'error'; message: string }

let mainWindow: BrowserWindow | null = null

/**
 * Sends an update status event to the renderer process.
 * Uses webContents.send for push-style communication.
 */
function pushStatus(status: UpdateStatus): void {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(IPC_CHANNELS.UPDATE_STATUS, status)
    }
}

/**
 * Initialise the auto-updater with the given BrowserWindow reference.
 * Called once after the main window is created.
 */
export function initUpdater(win: BrowserWindow): void {
    mainWindow = win

    // User-initiated updates only — do not auto-download
    autoUpdater.autoDownload = false
    autoUpdater.autoInstallOnAppQuit = true

    // ─── Lifecycle Event Handlers ──────────────────────
    autoUpdater.on('checking-for-update', () => {
        pushStatus({ state: 'checking' })
    })

    autoUpdater.on('update-available', (info: UpdateInfo) => {
        pushStatus({
            state: 'available',
            version: info.version,
            releaseDate: info.releaseDate?.toString() ?? ''
        })
    })

    autoUpdater.on('update-not-available', (info: UpdateInfo) => {
        pushStatus({
            state: 'not-available',
            version: info.version
        })
    })

    autoUpdater.on('download-progress', (progress: ProgressInfo) => {
        pushStatus({
            state: 'downloading',
            percent: Math.round(progress.percent),
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total
        })
    })

    autoUpdater.on('update-downloaded', (info: UpdateInfo) => {
        pushStatus({
            state: 'downloaded',
            version: info.version
        })
    })

    autoUpdater.on('error', (err: Error) => {
        pushStatus({
            state: 'error',
            message: err.message || 'An unknown error occurred during the update.'
        })
    })
}

/**
 * Check GitHub Releases for a newer version.
 * Returns the result via push events (update-available / update-not-available / error).
 */
export async function checkForUpdates(): Promise<void> {
    await autoUpdater.checkForUpdates()
}

/**
 * Begin downloading the available update.
 * Progress is reported via push events.
 */
export async function downloadUpdate(): Promise<void> {
    await autoUpdater.downloadUpdate()
}

/**
 * Quit the application and install the downloaded update.
 */
export function installUpdate(): void {
    autoUpdater.quitAndInstall(false, true)
}
