// ────────────────────────────────────────────────────────
// Costerra ERP — Backup Service
// Handles database backup (zip) and restore operations.
// Blocks write operations during backup via a locking flag.
// ────────────────────────────────────────────────────────

import { app } from 'electron'
import { join } from 'path'
import { createWriteStream, existsSync, mkdirSync, statSync, copyFileSync, rmSync } from 'fs'
import archiver from 'archiver'
import extractZip from 'extract-zip'
import { getPrisma, disconnectDatabase, initDatabase, getDatabasePath } from '../database/prisma-client'
import { APP_CONFIG } from '../../shared/constants'
import type { BackupLogData } from '../../shared/types'

/**
 * Performs a full database reset:
 * 1. Disconnects the active Prisma client
 * 2. Deletes the SQLite database file
 * 3. Deletes the assets directory (product images)
 * 4. Re-initialises the database with a fresh schema
 *
 * IMPORTANT: A backup MUST be created before calling this.
 * The IPC handler enforces this — this function does NOT.
 */
export async function resetDatabase(): Promise<void> {
    const userDataPath = app.getPath('userData')
    const dbPath = getDatabasePath()
    const assetsPath = join(userDataPath, APP_CONFIG.ASSETS_DIR)

    // 1. Disconnect existing Prisma connection
    await disconnectDatabase()

    // 2. Delete the database file
    if (existsSync(dbPath)) {
        rmSync(dbPath, { force: true })
    }
    // Also remove WAL/SHM journal files if present (SQLite)
    const walPath = `${dbPath}-wal`
    const shmPath = `${dbPath}-shm`
    if (existsSync(walPath)) rmSync(walPath, { force: true })
    if (existsSync(shmPath)) rmSync(shmPath, { force: true })

    // 3. Delete the assets directory
    if (existsSync(assetsPath)) {
        rmSync(assetsPath, { recursive: true, force: true })
    }
    // Re-create the required asset subdirectories
    mkdirSync(join(assetsPath, 'products'), { recursive: true })

    // 4. Re-initialise the database with a CLEAN schema (no seed data)
    await initDatabase(true)
}

/** Global lock flag — checked by IPC middleware to block writes during backup */
let backupInProgress = false

export function isBackupInProgress(): boolean {
    return backupInProgress
}

/**
 * Creates a full system backup:
 * 1. Sets the backup lock flag
 * 2. Packages costerra.db + assets/ into a timestamped .zip
 * 3. Logs the backup in the BackupLog table
 * 4. Releases the lock
 */
export async function createBackup(): Promise<BackupLogData> {
    const prisma = getPrisma()
    const userDataPath = app.getPath('userData')
    const backupsDir = join(userDataPath, APP_CONFIG.BACKUPS_DIR)

    if (!existsSync(backupsDir)) {
        mkdirSync(backupsDir, { recursive: true })
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `costerra-backup-${timestamp}.zip`
    const filePath = join(backupsDir, filename)

    backupInProgress = true

    try {
        // Create the zip archive
        await new Promise<void>((resolve, reject) => {
            const output = createWriteStream(filePath)
            const archive = archiver('zip', { zlib: { level: 9 } })

            output.on('close', resolve)
            archive.on('error', reject)

            archive.pipe(output)

            // Add the SQLite database file
            const dbPath = join(userDataPath, APP_CONFIG.DB_FILENAME)
            if (existsSync(dbPath)) {
                archive.file(dbPath, { name: APP_CONFIG.DB_FILENAME })
            }

            // Add the assets directory
            const assetsPath = join(userDataPath, APP_CONFIG.ASSETS_DIR)
            if (existsSync(assetsPath)) {
                archive.directory(assetsPath, APP_CONFIG.ASSETS_DIR)
            }

            archive.finalize()
        })

        // Get file size and log the backup
        const stats = statSync(filePath)
        const backupLog = await prisma.backupLog.create({
            data: {
                filename,
                filePath,
                sizeBytes: stats.size
            }
        })

        return backupLog as unknown as BackupLogData
    } finally {
        backupInProgress = false
    }
}

/**
 * Restores from a backup .zip file:
 * 1. Extracts the zip to a temp directory
 * 2. Replaces the active database and assets
 * 3. Reloads the application state
 */
export async function restoreBackup(zipPath: string): Promise<void> {
    if (!existsSync(zipPath)) {
        throw new Error(`Backup file not found: ${zipPath}`)
    }

    const userDataPath = app.getPath('userData')
    const tempDir = join(userDataPath, '_restore_temp')

    backupInProgress = true

    try {
        // Extract to temp directory
        if (existsSync(tempDir)) {
            rmSync(tempDir, { recursive: true, force: true })
        }
        mkdirSync(tempDir, { recursive: true })

        await extractZip(zipPath, { dir: tempDir })

        // Replace database file
        const extractedDb = join(tempDir, APP_CONFIG.DB_FILENAME)
        const activeDb = join(userDataPath, APP_CONFIG.DB_FILENAME)
        if (existsSync(extractedDb)) {
            copyFileSync(extractedDb, activeDb)
        }

        // Replace assets directory
        const extractedAssets = join(tempDir, APP_CONFIG.ASSETS_DIR)
        const activeAssets = join(userDataPath, APP_CONFIG.ASSETS_DIR)
        if (existsSync(extractedAssets)) {
            if (existsSync(activeAssets)) {
                rmSync(activeAssets, { recursive: true, force: true })
            }
            // Copy extracted assets to active location
            mkdirSync(activeAssets, { recursive: true })
            copyDirectorySync(extractedAssets, activeAssets)
        }

        // Clean up temp directory
        rmSync(tempDir, { recursive: true, force: true })
    } finally {
        backupInProgress = false
    }
}

/**
 * Lists all recorded backups, newest first.
 */
export async function listBackups(): Promise<BackupLogData[]> {
    const prisma = getPrisma()
    const logs = await prisma.backupLog.findMany({
        orderBy: { createdAt: 'desc' }
    })
    return logs as unknown as BackupLogData[]
}

// ─── Utility: Recursive directory copy ───────────────

import { readdirSync } from 'fs'

function copyDirectorySync(src: string, dest: string): void {
    if (!existsSync(dest)) {
        mkdirSync(dest, { recursive: true })
    }

    const entries = readdirSync(src, { withFileTypes: true })

    for (const entry of entries) {
        const srcPath = join(src, entry.name)
        const destPath = join(dest, entry.name)

        if (entry.isDirectory()) {
            copyDirectorySync(srcPath, destPath)
        } else {
            copyFileSync(srcPath, destPath)
        }
    }
}
