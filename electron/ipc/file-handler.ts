import { ipcMain, dialog, BrowserWindow } from 'electron'
import { writeFile, readFile } from 'node:fs/promises'
import { extname } from 'node:path'

interface FileFilter {
  name: string
  extensions: string[]
}

// 用户在节点上补的图（截图/示意图等）——只接受生图 API 和 <img> 标签都认得的常见格式，
// 跟参考 skill 的做法一致（strict input asset 只接受 png/webp/jpg 这类标准格式）
const IMAGE_MIME_BY_EXT: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp'
}

export function registerFileHandlers(): void {
  ipcMain.handle('choose-save-path', async (event, defaultName: string, filters: FileFilter[]): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options = { defaultPath: defaultName, filters }
    const result = win ? await dialog.showSaveDialog(win, options) : await dialog.showSaveDialog(options)
    if (result.canceled || !result.filePath) return null
    return result.filePath
  })

  ipcMain.handle('write-binary-file', async (_event, path: string, data: ArrayBuffer): Promise<void> => {
    await writeFile(path, Buffer.from(data))
  })

  // 选一张图片文件，读出来编码成 data URL 直接返回——不是只返回路径，因为渲染进程后续要把这张图
  // 存进 plan 数据里（跟生成图片一样落盘在 electron-store，不依赖原文件之后还在不在原路径）
  ipcMain.handle('choose-image-file', async (event): Promise<string | null> => {
    const win = BrowserWindow.fromWebContents(event.sender)
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['png', 'jpg', 'jpeg', 'webp'] }]
    }
    const result = win ? await dialog.showOpenDialog(win, options) : await dialog.showOpenDialog(options)
    if (result.canceled || result.filePaths.length === 0) return null

    const filePath = result.filePaths[0]
    const mime = IMAGE_MIME_BY_EXT[extname(filePath).toLowerCase()]
    if (!mime) throw new Error('不支持这种图片格式，请选择 png/jpg/webp')

    const buffer = await readFile(filePath)
    return `data:${mime};base64,${buffer.toString('base64')}`
  })
}
