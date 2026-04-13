// ────────────────────────────────────────────────────────
// Costerra ERP — Schema Bootstrap
// Creates all database tables using raw SQL via
// better-sqlite3. This replaces the `npx prisma migrate
// deploy` CLI call which cannot run in a packaged
// Electron app (users don't have Node.js installed).
//
// The SQL here mirrors the Prisma schema exactly.
// If the schema is ever modified, this file must be
// updated to match.
// ────────────────────────────────────────────────────────

import Database from 'better-sqlite3'

/**
 * Creates all tables in the given SQLite database file.
 * Uses `IF NOT EXISTS` so it's safe to call multiple times.
 * Also creates the `_prisma_migrations` table so that
 * PrismaClient recognises the DB as "migrated".
 */
export function bootstrapSchema(dbPath: string): void {
    const db = new Database(dbPath)

    // Enable WAL mode for better concurrent read performance
    db.pragma('journal_mode = WAL')

    db.exec(`
        -- ─── Prisma Migrations Table ───────────────────
        -- PrismaClient checks this table to determine
        -- if the database is in a valid state.
        CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
            "id"                    TEXT PRIMARY KEY NOT NULL,
            "checksum"              TEXT NOT NULL,
            "finished_at"           DATETIME,
            "migration_name"        TEXT NOT NULL,
            "logs"                  TEXT,
            "rolled_back_at"        DATETIME,
            "started_at"            DATETIME NOT NULL DEFAULT current_timestamp,
            "applied_steps_count"   INTEGER UNSIGNED NOT NULL DEFAULT 0
        );

        -- ─── Product Information Management ────────────
        CREATE TABLE IF NOT EXISTS "Product" (
            "id"               INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "skuNumber"        TEXT NOT NULL,
            "productGroup"     TEXT NOT NULL,
            "productFamily"    TEXT NOT NULL,
            "name"             TEXT NOT NULL,
            "color"            TEXT NOT NULL,
            "imagePath"        TEXT,
            "defaultUnitCost"  REAL NOT NULL,
            "defaultUnitPrice" REAL NOT NULL,
            "isActive"         BOOLEAN NOT NULL DEFAULT 1,
            "createdAt"        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"        DATETIME NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "Product_skuNumber_key" ON "Product"("skuNumber");
        CREATE INDEX IF NOT EXISTS "Product_isActive_idx" ON "Product"("isActive");
        CREATE INDEX IF NOT EXISTS "Product_productGroup_idx" ON "Product"("productGroup");
        CREATE INDEX IF NOT EXISTS "Product_productFamily_idx" ON "Product"("productFamily");

        CREATE TABLE IF NOT EXISTS "ProductHistory" (
            "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "productId" INTEGER NOT NULL,
            "fieldName" TEXT NOT NULL,
            "oldValue"  TEXT NOT NULL,
            "newValue"  TEXT NOT NULL,
            "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ProductHistory_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "ProductHistory_productId_idx" ON "ProductHistory"("productId");

        -- ─── Supplier & Purchase Orders ────────────────
        CREATE TABLE IF NOT EXISTS "Supplier" (
            "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "name"        TEXT NOT NULL,
            "contactName" TEXT NOT NULL DEFAULT '',
            "phone"       TEXT NOT NULL DEFAULT '',
            "email"       TEXT NOT NULL DEFAULT '',
            "notes"       TEXT NOT NULL DEFAULT '',
            "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"   DATETIME NOT NULL
        );

        CREATE TABLE IF NOT EXISTS "SupplierHistory" (
            "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "supplierId" INTEGER NOT NULL,
            "fieldName"  TEXT NOT NULL,
            "oldValue"   TEXT NOT NULL,
            "newValue"   TEXT NOT NULL,
            "changedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "SupplierHistory_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "SupplierHistory_supplierId_idx" ON "SupplierHistory"("supplierId");

        CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
            "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "poNumber"    TEXT NOT NULL,
            "supplierId"  INTEGER NOT NULL,
            "description" TEXT NOT NULL DEFAULT '',
            "status"      TEXT NOT NULL DEFAULT 'DRAFT',
            "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"   DATETIME NOT NULL,
            CONSTRAINT "PurchaseOrder_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "Supplier" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "PurchaseOrder_poNumber_key" ON "PurchaseOrder"("poNumber");
        CREATE INDEX IF NOT EXISTS "PurchaseOrder_supplierId_idx" ON "PurchaseOrder"("supplierId");
        CREATE INDEX IF NOT EXISTS "PurchaseOrder_status_idx" ON "PurchaseOrder"("status");

        CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
            "id"              INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "purchaseOrderId" INTEGER NOT NULL,
            "productId"       INTEGER NOT NULL,
            "quantity"        INTEGER NOT NULL,
            "unitCost"        REAL NOT NULL,
            CONSTRAINT "PurchaseOrderItem_purchaseOrderId_fkey" FOREIGN KEY ("purchaseOrderId") REFERENCES "PurchaseOrder" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "PurchaseOrderItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_purchaseOrderId_idx" ON "PurchaseOrderItem"("purchaseOrderId");
        CREATE INDEX IF NOT EXISTS "PurchaseOrderItem_productId_idx" ON "PurchaseOrderItem"("productId");

        -- ─── Inventory (FIFO Double-Entry Ledger) ──────
        CREATE TABLE IF NOT EXISTS "InventoryBatch" (
            "id"                  INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "productId"           INTEGER NOT NULL,
            "purchaseOrderItemId" INTEGER NOT NULL,
            "initialQty"          INTEGER NOT NULL,
            "remainingQty"        INTEGER NOT NULL,
            "reservedQty"         INTEGER NOT NULL DEFAULT 0,
            "unitCost"            REAL NOT NULL,
            "receivedAt"          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "InventoryBatch_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "InventoryBatch_purchaseOrderItemId_fkey" FOREIGN KEY ("purchaseOrderItemId") REFERENCES "PurchaseOrderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "InventoryBatch_productId_receivedAt_idx" ON "InventoryBatch"("productId", "receivedAt");
        CREATE INDEX IF NOT EXISTS "InventoryBatch_purchaseOrderItemId_idx" ON "InventoryBatch"("purchaseOrderItemId");

        -- ─── Client Relationship Management ────────────
        CREATE TABLE IF NOT EXISTS "Client" (
            "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "clientNumber" TEXT NOT NULL,
            "name"         TEXT NOT NULL,
            "surname"      TEXT NOT NULL,
            "address"      TEXT NOT NULL DEFAULT '',
            "city"         TEXT NOT NULL DEFAULT '',
            "zipCode"      TEXT NOT NULL DEFAULT '',
            "phone"        TEXT NOT NULL DEFAULT '',
            "notes"        TEXT NOT NULL DEFAULT '',
            "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"    DATETIME NOT NULL
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "Client_clientNumber_key" ON "Client"("clientNumber");

        CREATE TABLE IF NOT EXISTS "ClientHistory" (
            "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "clientId"  INTEGER NOT NULL,
            "fieldName" TEXT NOT NULL,
            "oldValue"  TEXT NOT NULL,
            "newValue"  TEXT NOT NULL,
            "changedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "ClientHistory_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "ClientHistory_clientId_idx" ON "ClientHistory"("clientId");

        -- ─── Sales Pipeline (Lead → Quote → Sale) ──────
        CREATE TABLE IF NOT EXISTS "SalesLead" (
            "id"         INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "leadNumber" TEXT NOT NULL,
            "clientId"   INTEGER NOT NULL,
            "name"       TEXT NOT NULL,
            "status"     TEXT NOT NULL DEFAULT 'IN_PROGRESS',
            "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"  DATETIME NOT NULL,
            CONSTRAINT "SalesLead_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "SalesLead_leadNumber_key" ON "SalesLead"("leadNumber");
        CREATE INDEX IF NOT EXISTS "SalesLead_clientId_idx" ON "SalesLead"("clientId");
        CREATE INDEX IF NOT EXISTS "SalesLead_status_idx" ON "SalesLead"("status");

        CREATE TABLE IF NOT EXISTS "Quote" (
            "id"          INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "quoteNumber" TEXT NOT NULL,
            "salesLeadId" INTEGER NOT NULL,
            "status"      TEXT NOT NULL DEFAULT 'DRAFT',
            "notes"       TEXT NOT NULL DEFAULT '',
            "taxRate"     REAL NOT NULL DEFAULT 0,
            "taxAmount"   REAL NOT NULL DEFAULT 0,
            "createdAt"   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            "updatedAt"   DATETIME NOT NULL,
            CONSTRAINT "Quote_salesLeadId_fkey" FOREIGN KEY ("salesLeadId") REFERENCES "SalesLead" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "Quote_quoteNumber_key" ON "Quote"("quoteNumber");
        CREATE INDEX IF NOT EXISTS "Quote_salesLeadId_idx" ON "Quote"("salesLeadId");
        CREATE INDEX IF NOT EXISTS "Quote_status_idx" ON "Quote"("status");

        CREATE TABLE IF NOT EXISTS "QuoteLineItem" (
            "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "quoteId"   INTEGER NOT NULL,
            "productId" INTEGER NOT NULL,
            "quantity"  INTEGER NOT NULL,
            "unitPrice" REAL NOT NULL,
            "unitCost"  REAL NOT NULL,
            "lineTotal" REAL NOT NULL,
            CONSTRAINT "QuoteLineItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
            CONSTRAINT "QuoteLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "QuoteLineItem_quoteId_idx" ON "QuoteLineItem"("quoteId");
        CREATE INDEX IF NOT EXISTS "QuoteLineItem_productId_idx" ON "QuoteLineItem"("productId");

        -- ─── Sales Ledger ──────────────────────────────
        CREATE TABLE IF NOT EXISTS "Sale" (
            "id"           INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "saleNumber"   TEXT NOT NULL,
            "quoteId"      INTEGER NOT NULL,
            "totalRevenue" REAL NOT NULL,
            "taxAmount"    REAL NOT NULL DEFAULT 0,
            "totalCost"    REAL NOT NULL,
            "profitAmount" REAL NOT NULL,
            "profitMargin" REAL NOT NULL,
            "saleDate"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT "Sale_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "Quote" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE UNIQUE INDEX IF NOT EXISTS "Sale_saleNumber_key" ON "Sale"("saleNumber");
        CREATE UNIQUE INDEX IF NOT EXISTS "Sale_quoteId_key" ON "Sale"("quoteId");
        CREATE INDEX IF NOT EXISTS "Sale_saleDate_idx" ON "Sale"("saleDate");

        CREATE TABLE IF NOT EXISTS "SaleLineItem" (
            "id"              INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "saleId"          INTEGER NOT NULL,
            "productId"       INTEGER NOT NULL,
            "quantity"        INTEGER NOT NULL,
            "unitPrice"       REAL NOT NULL,
            "blendedUnitCost" REAL NOT NULL,
            "lineRevenue"     REAL NOT NULL,
            "lineCost"        REAL NOT NULL,
            "lineProfit"      REAL NOT NULL,
            CONSTRAINT "SaleLineItem_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
            CONSTRAINT "SaleLineItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
        );
        CREATE INDEX IF NOT EXISTS "SaleLineItem_saleId_idx" ON "SaleLineItem"("saleId");
        CREATE INDEX IF NOT EXISTS "SaleLineItem_productId_idx" ON "SaleLineItem"("productId");

        -- ─── System Operations ─────────────────────────
        CREATE TABLE IF NOT EXISTS "BackupLog" (
            "id"        INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
            "filename"  TEXT NOT NULL,
            "filePath"  TEXT NOT NULL,
            "sizeBytes" INTEGER NOT NULL,
            "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );

        -- ─── Record this as a completed migration ──────
        INSERT OR IGNORE INTO "_prisma_migrations" (
            "id", "checksum", "migration_name", "finished_at", "applied_steps_count"
        ) VALUES (
            'bootstrap-v1', 'bootstrap', 'bootstrap_schema_v1',
            datetime('now'), 1
        );
    `)

    db.close()
}
