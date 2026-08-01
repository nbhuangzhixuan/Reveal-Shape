import { join } from 'node:path'
import { renameSync } from 'node:fs'
import { app } from 'electron'
import Store from 'electron-store'
import type { AppSettings, Plan, PptxExportSession, SavedSlideStyle } from '@shared/index'

const defaults: AppSettings = {
  activeProvider: 'openai',
  providers: {}
}

export const settingsStore = new Store<AppSettings>({
  name: 'settings',
  defaults
})

export function getSettings(): AppSettings {
  return {
    activeProvider: settingsStore.get('activeProvider'),
    providers: settingsStore.get('providers'),
    imageProvider: settingsStore.get('imageProvider'),
    visionQaProvider: settingsStore.get('visionQaProvider')
  }
}

export function saveSettings(settings: AppSettings): AppSettings {
  settingsStore.set('activeProvider', settings.activeProvider)
  settingsStore.set('providers', settings.providers)
  settingsStore.set('imageProvider', settings.imageProvider)
  settingsStore.set('visionQaProvider', settings.visionQaProvider)
  return getSettings()
}

export interface PlanState {
  plans: Plan[]
  activePlanId: string | null
}

// 不用模块顶层的 new Store()：electron-store 构造时就会读文件，plan.json 一旦损坏（JSON 不完整，
// 通常是异常退出/强杀时写盘中断）会直接抛错，让整个主进程加载失败——历史记录看起来"全丢了"。
// 改成懒加载 + 构造容错：首次访问时才构造，损坏时把坏文件挪成备份、以空态继续跑
let planStoreInstance: Store<PlanState> | null = null
function getPlanStore(): Store<PlanState> {
  if (planStoreInstance) return planStoreInstance
  const filePath = join(app.getPath('userData'), 'plan.json')
  try {
    planStoreInstance = new Store<PlanState>({
      name: 'plan',
      defaults: { plans: [], activePlanId: null }
    })
  } catch (error) {
    // 构造失败说明 plan.json 已损坏——把坏文件挪成备份留作人工恢复，重新用干净状态构造
    try {
      renameSync(filePath, `${filePath}.corrupt-${Date.now()}`)
    } catch {
      // 挪不动就算了，不阻塞启动
    }
    console.error('[plan-store] 计划文件损坏，已隔离为备份并重置', error)
    planStoreInstance = new Store<PlanState>({
      name: 'plan',
      defaults: { plans: [], activePlanId: null }
    })
  }
  return planStoreInstance
}

export function getPlanState(): PlanState {
  const store = getPlanStore()
  return {
    plans: store.get('plans'),
    activePlanId: store.get('activePlanId')
  }
}

export function savePlanState(plans: Plan[], activePlanId: string | null): void {
  const store = getPlanStore()
  store.set('plans', plans)
  store.set('activePlanId', activePlanId)
}

// PPT 生成进度——按 planId 存，一份计划同一时间只有一个进行中的导出会话；
// 每成功生成一页就整份覆盖写一次，这样渲染进程被重建（HMR 整页重载/意外关闭/崩溃）后重新打开也能接着生成
interface PptxSessionState {
  sessions: Record<string, PptxExportSession>
}

export const pptxSessionStore = new Store<PptxSessionState>({
  name: 'pptx-export-sessions',
  defaults: { sessions: {} }
})

export function getPptxExportSession(planId: string): PptxExportSession | null {
  const sessions = pptxSessionStore.get('sessions')
  return sessions[planId] ?? null
}

export function savePptxExportSession(session: PptxExportSession): void {
  const sessions = pptxSessionStore.get('sessions')
  pptxSessionStore.set('sessions', { ...sessions, [session.planId]: session })
}

export function clearPptxExportSession(planId: string): void {
  const sessions = pptxSessionStore.get('sessions')
  if (!(planId in sessions)) return
  const next = { ...sessions }
  delete next[planId]
  pptxSessionStore.set('sessions', next)
}

// 个人风格库——保存过的 PPT 视觉风格，下次生成时可以直接选它，不用每次都重新让 AI 现场提议
interface SlideStyleLibraryState {
  styles: SavedSlideStyle[]
}

export const slideStyleLibraryStore = new Store<SlideStyleLibraryState>({
  name: 'slide-style-library',
  defaults: { styles: [] }
})

export function getSavedSlideStyles(): SavedSlideStyle[] {
  return slideStyleLibraryStore.get('styles')
}

export function saveSlideStyle(style: SavedSlideStyle): SavedSlideStyle[] {
  const styles = slideStyleLibraryStore.get('styles').filter((s) => s.name !== style.name)
  const next = [...styles, style]
  slideStyleLibraryStore.set('styles', next)
  return next
}

export function deleteSlideStyle(name: string): SavedSlideStyle[] {
  const next = slideStyleLibraryStore.get('styles').filter((s) => s.name !== name)
  slideStyleLibraryStore.set('styles', next)
  return next
}
