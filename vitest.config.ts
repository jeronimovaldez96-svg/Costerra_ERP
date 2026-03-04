// ────────────────────────────────────────────────────────
// Costerra ERP — Vitest Configuration
// ────────────────────────────────────────────────────────

import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
    test: {
        globals: true,
        environment: 'node',
        include: ['tests/**/*.test.ts'],
        setupFiles: ['tests/setup.ts'],
        testTimeout: 15000,
        pool: 'forks',
        poolOptions: {
            forks: {
                singleFork: true
            }
        },
        sequence: {
            // Run tests sequentially since they share a database
            concurrent: false
        }
    },
    resolve: {
        alias: {
            '@main': resolve(__dirname, 'src/main'),
            '@shared': resolve(__dirname, 'src/shared')
        }
    }
})
