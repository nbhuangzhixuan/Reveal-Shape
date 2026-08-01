import { contextBridge, ipcRenderer } from 'electron'
import type {
  AnsweredQuestion,
  AppSettings,
  FiveWTwoHDraft,
  LayoutDecision,
  LayoutDecisionInput,
  NodeRewriteResult,
  Plan,
  PptxExportSession,
  RestructureDraft,
  SavedSlideStyle,
  SlideNote,
  SlideNoteInput,
  SlideStyleOption,
  TreeNode,
  UnderstandingQuestionDraft,
  UnderstandingSynthesis
} from '../src/types'

interface PlanState {
  plans: Plan[]
  activePlanId: string | null
}

interface TreePathNode {
  title: string
  description?: string
}

interface GenerateChildrenResult {
  children: TreeNode[]
  sequential: boolean
}

interface FileFilter {
  name: string
  extensions: string[]
}

const api = {
  selectUnderstandingQuestions: (task: string, referenceText?: string): Promise<UnderstandingQuestionDraft[]> =>
    ipcRenderer.invoke('select-understanding-questions', task, referenceText),

  synthesizeUnderstanding: (task: string, answered: AnsweredQuestion[], referenceText?: string): Promise<UnderstandingSynthesis> =>
    ipcRenderer.invoke('synthesize-understanding', task, answered, referenceText),

  refineUnderstanding: (task: string, current: UnderstandingSynthesis, feedback: string): Promise<UnderstandingSynthesis> =>
    ipcRenderer.invoke('refine-understanding', task, current, feedback),

  deriveRestructure: (task: string, understanding: FiveWTwoHDraft): Promise<RestructureDraft> =>
    ipcRenderer.invoke('derive-restructure', task, understanding),

  refineRestructure: (task: string, current: RestructureDraft, feedback: string): Promise<RestructureDraft> =>
    ipcRenderer.invoke('refine-restructure', task, current, feedback),

  generateChildren: (
    task: string,
    understanding: FiveWTwoHDraft,
    restructure: RestructureDraft,
    path: TreePathNode[],
    feedback?: string
  ): Promise<GenerateChildrenResult> =>
    ipcRenderer.invoke('generate-children', task, understanding, restructure, path, feedback),

  rewriteNode: (
    task: string,
    understanding: FiveWTwoHDraft,
    restructure: RestructureDraft,
    path: TreePathNode[],
    siblings: TreePathNode[],
    feedback: string
  ): Promise<NodeRewriteResult> =>
    ipcRenderer.invoke('rewrite-node', task, understanding, restructure, path, siblings, feedback),

  getSettings: (): Promise<AppSettings> =>
    ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: AppSettings): Promise<AppSettings> =>
    ipcRenderer.invoke('save-settings', settings),

  getPlanState: (): Promise<PlanState> =>
    ipcRenderer.invoke('get-plan-state'),

  savePlanState: (plans: Plan[], activePlanId: string | null): Promise<void> =>
    ipcRenderer.invoke('save-plan-state', plans, activePlanId),

  importDocxText: (data: ArrayBuffer): Promise<string> =>
    ipcRenderer.invoke('import-docx-text', data),

  generateSlideImage: (prompt: string, requestId: string, inputImagesB64?: string[]): Promise<string> =>
    ipcRenderer.invoke('generate-slide-image', prompt, requestId, inputImagesB64),

  onSlideImageProgress: (callback: (requestId: string, partialImage: string, index: number) => void): (() => void) => {
    const listener = (_event: unknown, requestId: string, partialImage: string, index: number) => callback(requestId, partialImage, index)
    ipcRenderer.on('slide-image-progress', listener)
    return () => ipcRenderer.removeListener('slide-image-progress', listener)
  },

  testImageGeneration: (apiKey: string, model: string, baseUrl?: string): Promise<string> =>
    ipcRenderer.invoke('test-image-generation', apiKey, model, baseUrl),

  chooseSavePath: (defaultName: string, filters: FileFilter[]): Promise<string | null> =>
    ipcRenderer.invoke('choose-save-path', defaultName, filters),

  chooseImageFile: (): Promise<string | null> =>
    ipcRenderer.invoke('choose-image-file'),

  writeBinaryFile: (path: string, data: ArrayBuffer): Promise<void> =>
    ipcRenderer.invoke('write-binary-file', path, data),

  qaCheckSlideImage: (imageBase64: string, expectedText: string[], referenceImageB64?: string, outlineContext?: string): Promise<{ ok: boolean; note: string }> =>
    ipcRenderer.invoke('qa-check-slide-image', imageBase64, expectedText, referenceImageB64, outlineContext),

  proposeSlideStyles: (task: string, backgroundText: string): Promise<SlideStyleOption[]> =>
    ipcRenderer.invoke('propose-slide-styles', task, backgroundText),

  getPptxExportSession: (planId: string): Promise<PptxExportSession | null> =>
    ipcRenderer.invoke('get-pptx-export-session', planId),

  savePptxExportSession: (session: PptxExportSession): Promise<void> =>
    ipcRenderer.invoke('save-pptx-export-session', session),

  clearPptxExportSession: (planId: string): Promise<void> =>
    ipcRenderer.invoke('clear-pptx-export-session', planId),

  getSavedSlideStyles: (): Promise<SavedSlideStyle[]> =>
    ipcRenderer.invoke('get-saved-slide-styles'),

  saveSlideStyle: (style: SavedSlideStyle): Promise<SavedSlideStyle[]> =>
    ipcRenderer.invoke('save-slide-style', style),

  deleteSlideStyle: (name: string): Promise<SavedSlideStyle[]> =>
    ipcRenderer.invoke('delete-slide-style', name),

  reviseSlideStyle: (task: string, currentBrief: Record<string, unknown>, feedback: string): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('revise-slide-style', task, currentBrief, feedback),

  decideSlideLayouts: (task: string, slides: LayoutDecisionInput[]): Promise<LayoutDecision[]> =>
    ipcRenderer.invoke('decide-slide-layouts', task, slides),

  generateSlideNotes: (task: string, backgroundText: string, slides: SlideNoteInput[]): Promise<SlideNote[]> =>
    ipcRenderer.invoke('generate-slide-notes', task, backgroundText, slides)
}

export type API = typeof api

contextBridge.exposeInMainWorld('api', api)
