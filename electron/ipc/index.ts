import { ipcMain } from 'electron'
import mammoth from 'mammoth'
import type { AppSettings, Plan, PptxExportSession, SavedSlideStyle } from '@shared/index'
import {
  getSettings,
  saveSettings,
  getPlanState,
  savePlanState,
  getPptxExportSession,
  savePptxExportSession,
  clearPptxExportSession,
  getSavedSlideStyles,
  saveSlideStyle,
  deleteSlideStyle,
  type PlanState
} from '../store'
import { registerAIHandlers } from './ai-handler'
import { registerImageHandlers } from './image-handler'
import { registerFileHandlers } from './file-handler'

export function registerIpcHandlers(): void {
  ipcMain.handle('get-settings', (): AppSettings => getSettings())
  ipcMain.handle('save-settings', (_event, settings: AppSettings): AppSettings =>
    saveSettings(settings)
  )

  ipcMain.handle('get-plan-state', (): PlanState => getPlanState())
  ipcMain.handle('save-plan-state', (_event, plans: Plan[], activePlanId: string | null): void =>
    savePlanState(plans, activePlanId)
  )

  ipcMain.handle('import-docx-text', async (_event, data: ArrayBuffer): Promise<string> => {
    const result = await mammoth.extractRawText({ buffer: Buffer.from(data) })
    return result.value
  })

  ipcMain.handle('get-pptx-export-session', (_event, planId: string): PptxExportSession | null =>
    getPptxExportSession(planId)
  )
  ipcMain.handle('save-pptx-export-session', (_event, session: PptxExportSession): void =>
    savePptxExportSession(session)
  )
  ipcMain.handle('clear-pptx-export-session', (_event, planId: string): void =>
    clearPptxExportSession(planId)
  )

  ipcMain.handle('get-saved-slide-styles', (): SavedSlideStyle[] => getSavedSlideStyles())
  ipcMain.handle('save-slide-style', (_event, style: SavedSlideStyle): SavedSlideStyle[] =>
    saveSlideStyle(style)
  )
  ipcMain.handle('delete-slide-style', (_event, name: string): SavedSlideStyle[] =>
    deleteSlideStyle(name)
  )

  registerAIHandlers()
  registerImageHandlers()
  registerFileHandlers()
}
