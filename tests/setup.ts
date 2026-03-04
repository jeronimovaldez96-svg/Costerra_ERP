// ────────────────────────────────────────────────────────
// Costerra ERP — Test Setup
// Creates an isolated test database using Prisma push,
// mocks getPrisma() to return the test client, and
// provides seed helpers for each test suite.
// ────────────────────────────────────────────────────────

import { PrismaClient } from '@prisma/client'
import { execSync } from 'child_process'
import { join } from 'path'
import { mkdirSync, existsSync, unlinkSync } from 'fs'
import { vi, beforeAll, afterAll, beforeEach } from 'vitest'

const TEST_DB_DIR = join(__dirname, '..', '.test-db')
const TEST_DB_PATH = join(TEST_DB_DIR, 'test.db')
const TEST_DB_URL = `file:${TEST_DB_PATH}`

let testPrisma: PrismaClient

/**
 * Global setup: create test database directory, push schema, and create client
 */
beforeAll(async () => {
    // Ensure test directory exists
    if (!existsSync(TEST_DB_DIR)) {
        mkdirSync(TEST_DB_DIR, { recursive: true })
    }

    // Remove stale test database
    if (existsSync(TEST_DB_PATH)) {
        unlinkSync(TEST_DB_PATH)
    }

    // Push schema to create tables (faster than migrate for testing)
    // --force-reset drops existing tables first, making this idempotent
    process.env.DATABASE_URL = TEST_DB_URL
    execSync('npx prisma db push --skip-generate --force-reset --accept-data-loss', {
        cwd: join(__dirname, '..'),
        env: { ...process.env, DATABASE_URL: TEST_DB_URL },
        stdio: 'pipe'
    })

    // Create test Prisma client
    testPrisma = new PrismaClient({
        datasources: { db: { url: TEST_DB_URL } },
        log: ['error']
    })
    await testPrisma.$connect()

    // Mock getPrisma in all service modules
    vi.mock('../src/main/database/prisma-client', () => ({
        getPrisma: () => testPrisma,
        getDatabasePath: () => TEST_DB_PATH
    }))

    // Mock the Electron app module for generateId
    vi.mock('electron', () => ({
        app: {
            getPath: () => TEST_DB_DIR,
            getAppPath: () => join(__dirname, '..')
        }
    }))
})

/**
 * Before each test: clean all tables for test isolation
 */
beforeEach(async () => {
    // Delete in reverse dependency order to respect FK constraints
    await testPrisma.saleLineItem.deleteMany()
    await testPrisma.sale.deleteMany()
    await testPrisma.quoteLineItem.deleteMany()
    await testPrisma.quote.deleteMany()
    await testPrisma.salesLead.deleteMany()
    await testPrisma.clientHistory.deleteMany()
    await testPrisma.client.deleteMany()
    await testPrisma.inventoryBatch.deleteMany()
    await testPrisma.purchaseOrderItem.deleteMany()
    await testPrisma.purchaseOrder.deleteMany()
    await testPrisma.productHistory.deleteMany()
    await testPrisma.product.deleteMany()
    await testPrisma.supplier.deleteMany()
    await testPrisma.backupLog.deleteMany()
})

/**
 * Global teardown: disconnect and clean up
 */
afterAll(async () => {
    await testPrisma.$disconnect()
})

export { testPrisma }
