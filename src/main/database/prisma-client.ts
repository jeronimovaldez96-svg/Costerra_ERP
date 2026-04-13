// ────────────────────────────────────────────────────────
// Costerra ERP — Prisma Client Singleton
// Ensures only one PrismaClient instance exists per
// application lifecycle. Sets DATABASE_URL dynamically
// based on Electron's userData path.
//
// Database bootstrap uses raw SQL via better-sqlite3
// instead of `npx prisma migrate deploy` so the packaged
// app works on machines without Node.js installed.
// ────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync, statSync } from 'fs'
import { APP_CONFIG } from '../../shared/constants'
import { bootstrapSchema } from './schema-bootstrap'

let prisma: PrismaClient | null = null

/**
 * Returns the absolute path to the runtime SQLite database.
 */
export function getDatabasePath(): string {
    return join(app.getPath('userData'), APP_CONFIG.DB_FILENAME)
}

/**
 * Returns the singleton PrismaClient instance.
 * Lazily initialises on first call with the correct DB path.
 */
export function getPrisma(): PrismaClient {
    if (!prisma) {
        const dbPath = getDatabasePath()
        const dbUrl = `file:${dbPath}`
        process.env.DATABASE_URL = dbUrl

        prisma = new PrismaClient({
            datasources: {
                db: { url: dbUrl }
            },
            log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error']
        })
    }
    return prisma
}

/**
 * Initialise the database connection and create schema if needed.
 * Called once during app startup in main/index.ts.
 *
 * Strategy:
 * 1. If the runtime DB doesn't exist or is empty (0 bytes),
 *    attempt to copy the dev migration seed from prisma/dev.db.
 * 2. If that's unavailable, create the schema using raw SQL
 *    via better-sqlite3 (no CLI tools required).
 * 3. Connect the PrismaClient.
 */
export async function initDatabase(forceClean = false): Promise<void> {
    const dbPath = getDatabasePath()
    const dbIsEmpty = !existsSync(dbPath) || statSync(dbPath).size === 0

    if (dbIsEmpty) {
        let bootstrapped = false

        // In development, copy the dev.db for convenience
        if (!forceClean) {
            const devDbPath = join(app.getAppPath(), 'prisma', 'dev.db')
            if (existsSync(devDbPath) && statSync(devDbPath).size > 0) {
                copyFileSync(devDbPath, dbPath)
                bootstrapped = true
            }
        }

        // In production (or if dev.db is missing), bootstrap via raw SQL.
        // This is the critical path for packaged apps — no npx/prisma CLI.
        if (!bootstrapped) {
            try {
                bootstrapSchema(dbPath)
                console.log('[Costerra] Database schema bootstrapped via raw SQL')
            } catch (err) {
                console.error('[Costerra] Failed to bootstrap database schema:', err)
            }
        }
    }

    const client = getPrisma()
    await client.$connect()
}

/**
 * Gracefully disconnect the database.
 * Called during app shutdown.
 */
export async function disconnectDatabase(): Promise<void> {
    if (prisma) {
        await prisma.$disconnect()
        prisma = null
    }
}
