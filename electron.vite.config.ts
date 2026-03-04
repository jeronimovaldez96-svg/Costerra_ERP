import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
    main: {
        plugins: [externalizeDepsPlugin()],
        build: {
            rollupOptions: {
                external: ['better-sqlite3', 'sharp', 'archiver', 'extract-zip']
            }
        }
    },
    preload: {
        plugins: [externalizeDepsPlugin()]
    },
    renderer: {
        root: resolve('src/renderer'),
        resolve: {
            alias: {
                '@': resolve('src/renderer'),
                '@shared': resolve('src/shared')
            }
        },
        plugins: [react()],
        build: {
            rollupOptions: {
                input: resolve('src/renderer/index.html')
            }
        }
    }
})
