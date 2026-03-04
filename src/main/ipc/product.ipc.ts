// ────────────────────────────────────────────────────────
// Costerra ERP — Product IPC Handlers
// Bridges Renderer requests to the Product service layer.
// ────────────────────────────────────────────────────────

import { ipcMain, dialog } from 'electron'
import { IPC_CHANNELS } from '../../shared/ipc-channels'
import * as productService from '../services/product.service'
import { saveProductImage } from '../utils/file-manager'
import type { IpcResponse } from '../../shared/types'
import type { ProductCreateInput, ProductUpdateInput, ListParams } from '../../shared/types'

export function registerProductHandlers(): void {
    ipcMain.handle(IPC_CHANNELS.PRODUCT_LIST, async (_event, params: ListParams): Promise<IpcResponse> => {
        try {
            const result = await productService.listProducts(params)
            return { success: true, data: result }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PRODUCT_GET, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const product = await productService.getProduct(id)
            return { success: true, data: product }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PRODUCT_CREATE, async (_event, input: ProductCreateInput & { imageSourcePath?: string }): Promise<IpcResponse> => {
        try {
            // Handle image upload if a source path was provided
            let imagePath: string | undefined
            if (input.imageSourcePath) {
                imagePath = saveProductImage(input.imageSourcePath)
            }

            const product = await productService.createProduct({
                ...input,
                imagePath
            })
            return { success: true, data: product }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PRODUCT_UPDATE, async (_event, input: ProductUpdateInput & { imageSourcePath?: string }): Promise<IpcResponse> => {
        try {
            let imagePath: string | undefined
            if (input.imageSourcePath) {
                imagePath = saveProductImage(input.imageSourcePath)
            }

            const product = await productService.updateProduct({
                ...input,
                ...(imagePath ? { imagePath } : {})
            })
            return { success: true, data: product }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PRODUCT_TOGGLE_ACTIVE, async (_event, id: number): Promise<IpcResponse> => {
        try {
            const product = await productService.toggleActive(id)
            return { success: true, data: product }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle(IPC_CHANNELS.PRODUCT_HISTORY, async (_event, productId: number): Promise<IpcResponse> => {
        try {
            const history = await productService.getProductHistory(productId)
            return { success: true, data: history }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })
}
