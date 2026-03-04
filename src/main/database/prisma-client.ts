// ────────────────────────────────────────────────────────
// Costerra ERP — Prisma Client Singleton
// Ensures only one PrismaClient instance exists per
// application lifecycle. Sets DATABASE_URL dynamically
// based on Electron's userData path.
// Deploys schema on first launch via `prisma migrate`.
// ────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import { app } from 'electron'
import { join } from 'path'
import { existsSync, copyFileSync, statSync } from 'fs'
import { execSync } from 'child_process'
import { APP_CONFIG } from '../../shared/constants'

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
 * Initialise the database connection and deploy schema if needed.
 * Called once during app startup in main/index.ts.
 *
 * Strategy:
 * 1. If the runtime DB doesn't exist or is empty (0 bytes),
 *    attempt to copy the dev migration seed from prisma/dev.db.
 * 2. If that's unavailable, run `prisma migrate deploy` to
 *    apply all migrations programmatically.
 * 3. Connect the PrismaClient.
 */
export async function initDatabase(forceClean = false): Promise<void> {
    const dbPath = getDatabasePath()
    const dbIsEmpty = !existsSync(dbPath) || statSync(dbPath).size === 0

    if (dbIsEmpty) {
        // On reset (forceClean), always deploy a clean schema — no seed data.
        // On normal startup, try dev.db first for developer convenience.
        let bootstrapped = false

        if (!forceClean) {
            const devDbPath = join(app.getAppPath(), 'prisma', 'dev.db')
            if (existsSync(devDbPath) && statSync(devDbPath).size > 0) {
                copyFileSync(devDbPath, dbPath)
                bootstrapped = true
            }
        }

        if (!bootstrapped) {
            // Deploy empty schema via migrations (no seed data)
            try {
                const prismaDir = join(app.getAppPath(), 'prisma')
                process.env.DATABASE_URL = `file:${dbPath}`
                execSync(
                    `npx prisma migrate deploy --schema="${join(prismaDir, 'schema.prisma')}"`,
                    {
                        cwd: app.getAppPath(),
                        env: { ...process.env, DATABASE_URL: `file:${dbPath}` },
                        stdio: 'pipe'
                    }
                )
            } catch (err) {
                console.error('[Costerra] Failed to deploy database schema:', err)
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
