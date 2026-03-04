// ────────────────────────────────────────────────────────
// Type augmentation for the preload-exposed API.
// Makes `window.api` available with full type safety
// in all renderer TypeScript files.
// ────────────────────────────────────────────────────────

import type { ElectronAPI } from '../preload/index'

declare global {
    interface Window {
        api: ElectronAPI
    }
}
