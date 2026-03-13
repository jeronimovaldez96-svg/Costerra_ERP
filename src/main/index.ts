// ────────────────────────────────────────────────────────
// Costerra ERP — Electron Main Process Entry
// Creates the BrowserWindow, registers IPC handlers,
// initialises Prisma, and sets up the asset directories.
// ────────────────────────────────────────────────────────

import { app, BrowserWindow, shell } from 'electron'
import { join } from 'path'
import { existsSync, mkdirSync } from 'fs'
import { initDatabase, disconnectDatabase } from './database/prisma-client'
import { registerAllIpcHandlers } from './ipc'
import { initUpdater } from './services/updater.service'
import { APP_CONFIG } from '../shared/constants'

/** Ensure required data directories exist inside userData */
function ensureDataDirectories(): void {
    const userDataPath = app.getPath('userData')
    const assetDir = join(userDataPath, APP_CONFIG.ASSETS_DIR)
    const backupDir = join(userDataPath, APP_CONFIG.BACKUPS_DIR)
    const productImageDir = join(assetDir, 'products')

    for (const dir of [assetDir, backupDir, productImageDir]) {
        if (!existsSync(dir)) {
            mkdirSync(dir, { recursive: true })
        }
    }
}

function createMainWindow(): BrowserWindow {
    const mainWindow = new BrowserWindow({
        width: 1440,
        height: 900,
        minWidth: 1024,
        minHeight: 680,
        show: false,
        title: APP_CONFIG.APP_NAME,
        titleBarStyle: 'hiddenInset',
        backgroundColor: 'hsl(226, 24%, 11%)',
        webPreferences: {
            preload: join(__dirname, '../preload/index.js'),
            sandbox: false,
            contextIsolation: true,
            nodeIntegration: false
        }
    })

    // Graceful show after content is ready (prevents white flash)
    mainWindow.on('ready-to-show', () => {
        mainWindow.show()
    })

    // Open external links in the user's default browser
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url)
        return { action: 'deny' }
    })

    // Load the renderer — dev server in development, built file in production
    if (process.env['ELECTRON_RENDERER_URL']) {
        mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
    } else {
        mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
    }

    return mainWindow
}

// ─── Application Lifecycle ───────────────────────────

app.whenReady().then(async () => {
    // 1. Ensure data directories exist
    ensureDataDirectories()

    // 2. Initialise database (deploys schema + connects)
    await initDatabase()

    // 3. Register all IPC handlers
    registerAllIpcHandlers()

    // 4. Create the main window
    const mainWindow = createMainWindow()

    // 5. Initialise the auto-updater with the window reference
    initUpdater(mainWindow)

    // macOS: recreate window when dock icon is clicked
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createMainWindow()
        }
    })
})

// Quit when all windows are closed (except macOS convention)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit()
    }
})

// Graceful database shutdown to prevent SQLite corruption
app.on('before-quit', async () => {
    await disconnectDatabase()
})

