// ────────────────────────────────────────────────────────
// Costerra ERP — File Manager
// Handles local image upload, deletion, and path resolution
// for product reference images stored in userData/assets/.
// ────────────────────────────────────────────────────────

import { app } from 'electron'
import { join, extname } from 'path'
import { copyFileSync, existsSync, unlinkSync, mkdirSync } from 'fs'
import { APP_CONFIG } from '../../shared/constants'

/**
 * Returns the absolute path to the product images directory.
 */
export function getProductImageDir(): string {
    return join(app.getPath('userData'), APP_CONFIG.ASSETS_DIR, 'products')
}

/**
 * Copies a user-selected image file to the application's asset directory.
 * Renames it with a timestamp to avoid collisions.
 *
 * @param sourcePath - Absolute path to the user's original file
 * @returns The relative path stored in the database (e.g., "products/1709472000000.webp")
 */
export function saveProductImage(sourcePath: string): string {
    const ext = extname(sourcePath).toLowerCase()
    const allowedExts = APP_CONFIG.SUPPORTED_IMAGE_TYPES

    if (!allowedExts.includes(ext)) {
        throw new Error(`Unsupported image type: ${ext}. Allowed: ${allowedExts.join(', ')}`)
    }

    const imageDir = getProductImageDir()
    if (!existsSync(imageDir)) {
        mkdirSync(imageDir, { recursive: true })
    }

    const filename = `${Date.now()}${ext}`
    const destPath = join(imageDir, filename)

    copyFileSync(sourcePath, destPath)

    // Return relative path for database storage
    return `products/${filename}`
}

/**
 * Resolves a relative image path to the absolute filesystem path.
 *
 * @param relativePath - The path stored in the database (e.g., "products/1709472000000.png")
 * @returns The absolute path for serving to the renderer
 */
export function resolveImagePath(relativePath: string | null): string | null {
    if (!relativePath) return null

    const absolutePath = join(app.getPath('userData'), APP_CONFIG.ASSETS_DIR, relativePath)
    return existsSync(absolutePath) ? absolutePath : null
}

/**
 * Deletes an image file from the asset directory.
 * Silently succeeds if the file doesn't exist (idempotent).
 *
 * @param relativePath - The path stored in the database
 */
export function deleteImage(relativePath: string | null): void {
    if (!relativePath) return

    const absolutePath = join(app.getPath('userData'), APP_CONFIG.ASSETS_DIR, relativePath)
    if (existsSync(absolutePath)) {
        unlinkSync(absolutePath)
    }
}
