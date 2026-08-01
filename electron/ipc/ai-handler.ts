import { ipcMain } from 'electron'
import { randomUUID } from 'node:crypto'
import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import type {
  AIProviderConfig,
  AnsweredQuestion,
  AppSettings,
  FiveWTwoHDraft,
  LayoutDecision,
  LayoutDecisionInput,
  NodeRewriteResult,
  RestructureDraft,
  SlideNote,
  SlideNoteInput,
  SlideStyleOption,
  TreeNode,
  UnderstandingQuestionDraft,
  UnderstandingSynthesis
} from '@shared/index'
import type { TreePathNode } from '@lib/ai/types'
import { createProvider } from '@lib/ai/provider'
import { parseJSONObject } from '@lib/ai/prompts'
import { BUILTIN_SLIDE_STYLES } from '@lib/styleLibrary'
import { getSettings } from '../store'

function resolveActiveConfig(settings: AppSettings) {
  const config = settings.providers[settings.activeProvider]
  if (!config) {
    throw new Error('当前选中的 AI 服务还未配置 API Key，请先在设置中填写')
  }
  return config
}

// 质检只有 openai/anthropic 两种协议——DeepSeek 官方 API 不支持识图，选中 DeepSeek 时改用用户单独填的 visionQaProvider；
// 选中 custom 时是否支持识图取决于用户接的具体第三方服务，这里按其声明的协议直接尝试，调用失败会在外层被吞掉、跳过质检
function resolveVisionQaConfig(settings: AppSettings): { protocol: 'openai' | 'anthropic'; config: AIProviderConfig } | null {
  if (settings.activeProvider === 'deepseek') {
    return settings.visionQaProvider ? { protocol: 'openai', config: settings.visionQaProvider } : null
  }
  const config = settings.providers[settings.activeProvider]
  if (!config) return null
  const protocol = settings.activeProvider === 'anthropic'
    ? 'anthropic'
    : settings.activeProvider === 'custom'
      ? (config.protocol === 'anthropic' ? 'anthropic' : 'openai')
      : 'openai'
  return { protocol, config }
}

// 对齐参考 skill 的做法（project-assembly-and-reporting.md 的 Quality Check And Repair 一节）：
// 质检清单里有一条"Slide content matches the outline"，跟"文字有没有逐字出现"是两件不同的事——
// 后者只看字符对不对，前者是看画面呈现的内容/结构有没有对应上这一页在大纲里该扮演的角色
// （比如"这几条要点有先后顺序"却被画成互不关联的并排卡片，或者版式决策要求的呈现方式没有被执行）。
// 之前只检查了字面文字，没检查这一条，这里补上，需要额外传一句这一页的角色说明作为判断依据
function buildQaPromptText(expectedText: string[], hasReferenceImage: boolean, outlineContext?: string): string {
  const checklist = [
    '1. 下面这些文字是否清晰、准确地出现在图片里（允许合理的视觉化排版调整，但不能是乱码、缺字或完全没出现）',
    outlineContext ? `2. 画面呈现的内容/结构是否对应上这一页在大纲里该扮演的角色：${outlineContext}` : '',
    '3. 画面有没有明显的裁切、文字被截断、元素重叠等版式问题',
    '4. 画面上是否出现了多余的页码/序号（除非"必须出现的文字"里明确包含页码/序号，否则画面上不应该有任何页码/序号）',
    hasReferenceImage ? '5. 这张图（第二张图）的整体视觉风格——配色、字体气质、排版密度、装饰元素——跟第一张参照图是否明显一致，而不是像另一套风格' : ''
  ].filter(Boolean)
  return `请查看${hasReferenceImage ? '第二张' : '这张'} PPT 幻灯片图片，检查以下几点，用 JSON 格式回答，不要有其他文字，不要用 markdown 代码块包裹：\n` +
    `${checklist.join('\n')}\n\n必须出现的文字：\n${expectedText.map((t) => `- ${t}`).join('\n')}\n\n严格按照以下格式返回：{"ok": true, "note": "一句话说明"}`
}

async function checkWithOpenAI(
  config: AIProviderConfig,
  imageBase64: string,
  expectedText: string[],
  referenceImageBase64?: string,
  outlineContext?: string
): Promise<{ ok: boolean; note: string }> {
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseUrl })
  const model = config.model || 'gpt-4o-mini'
  const imageParts: OpenAI.Chat.ChatCompletionContentPart[] = referenceImageBase64
    ? [
        { type: 'image_url', image_url: { url: `data:image/png;base64,${referenceImageBase64}` } },
        { type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }
      ]
    : [{ type: 'image_url', image_url: { url: `data:image/png;base64,${imageBase64}` } }]
  const completion = await client.chat.completions.create({
    model,
    messages: [{
      role: 'user',
      content: [
        { type: 'text', text: buildQaPromptText(expectedText, !!referenceImageBase64, outlineContext) },
        ...imageParts
      ]
    }]
  })
  const raw = completion.choices[0]?.message?.content
  if (!raw) throw new Error('质检模型未返回内容')
  return parseJSONObject<{ ok: boolean; note: string }>(raw)
}

async function checkWithAnthropic(
  config: AIProviderConfig,
  imageBase64: string,
  expectedText: string[],
  referenceImageBase64?: string,
  outlineContext?: string
): Promise<{ ok: boolean; note: string }> {
  const client = new Anthropic({ apiKey: config.apiKey, baseURL: config.baseUrl })
  const model = config.model || 'claude-opus-4-8'
  const imageBlocks: Anthropic.ImageBlockParam[] = referenceImageBase64
    ? [
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: referenceImageBase64 } },
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } }
      ]
    : [{ type: 'image', source: { type: 'base64', media_type: 'image/png', data: imageBase64 } }]
  const response = await client.messages.create({
    model,
    max_tokens: 512,
    messages: [{
      role: 'user',
      content: [
        ...imageBlocks,
        { type: 'text', text: buildQaPromptText(expectedText, !!referenceImageBase64, outlineContext) }
      ]
    }]
  })
  const text = response.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('')
  if (!text) throw new Error('质检模型未返回内容')
  return parseJSONObject<{ ok: boolean; note: string }>(text)
}

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return '发生未知错误，请稍后重试'
}

export function registerAIHandlers(): void {
  ipcMain.handle('select-understanding-questions', async (_event, task: string, referenceText?: string): Promise<UnderstandingQuestionDraft[]> => {
    try {
      const settings = getSettings()
      const provider = createProvider(resolveActiveConfig(settings))
      return await provider.selectUnderstandingQuestions(task, referenceText)
    } catch (error) {
      throw new Error(describeError(error))
    }
  })

  ipcMain.handle(
    'synthesize-understanding',
    async (_event, task: string, answered: AnsweredQuestion[], referenceText?: string): Promise<UnderstandingSynthesis> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.synthesizeUnderstanding(task, answered, referenceText)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'refine-understanding',
    async (_event, task: string, current: UnderstandingSynthesis, feedback: string): Promise<UnderstandingSynthesis> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.refineUnderstanding(task, current, feedback)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'derive-restructure',
    async (_event, task: string, understanding: FiveWTwoHDraft): Promise<RestructureDraft> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.deriveRestructure(task, understanding)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'refine-restructure',
    async (_event, task: string, current: RestructureDraft, feedback: string): Promise<RestructureDraft> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.refineRestructure(task, current, feedback)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'generate-children',
    async (
      _event,
      task: string,
      understanding: FiveWTwoHDraft,
      restructure: RestructureDraft,
      path: TreePathNode[],
      feedback?: string
    ): Promise<{ children: TreeNode[]; sequential: boolean }> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        const batch = await provider.generateChildren(task, understanding, restructure, path, feedback)
        return {
          sequential: batch.sequential,
          children: batch.children.map((draft) => ({
            id: randomUUID(),
            title: draft.title,
            description: draft.description,
            children: [],
            isLeaf: draft.isLeaf,
            confirmed: false,
            isLoading: false
          }))
        }
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'rewrite-node',
    async (
      _event,
      task: string,
      understanding: FiveWTwoHDraft,
      restructure: RestructureDraft,
      path: TreePathNode[],
      siblings: TreePathNode[],
      feedback: string
    ): Promise<NodeRewriteResult> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.rewriteNode(task, understanding, restructure, path, siblings, feedback)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'propose-slide-styles',
    async (_event, task: string, backgroundText: string): Promise<SlideStyleOption[]> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        const recommendations = await provider.recommendSlideStyles(task, backgroundText)
        // 模型只返回风格名+理由，实际的风格 JSON（brief）从本地内置风格库按名字精确匹配取出——
        // brief 本身从不经过模型生成，规避了"模型现场写长 JSON 容易引号不配对、解析失败"的问题
        const matched = recommendations
          .map((r) => {
            const style = BUILTIN_SLIDE_STYLES.find((s) => s.name === r.name)
            if (!style) return null
            return { name: style.name, description: r.reason, recommended: r.recommended, brief: style.brief }
          })
          .filter((s): s is SlideStyleOption => s !== null)
        // 模型偶尔会返回风格库里不存在的名字（幻觉/拼写不一致），导致一个都匹配不上；
        // 这种情况下退化成给前 3 个内置风格，保证这一步永远有结果可选，不会卡住整个向导
        if (matched.length > 0) return matched
        return BUILTIN_SLIDE_STYLES.slice(0, 3).map((style, i) => ({
          name: style.name,
          description: '内置风格',
          recommended: i === 0,
          brief: style.brief
        }))
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'revise-slide-style',
    async (_event, task: string, currentBrief: Record<string, unknown>, feedback: string): Promise<Record<string, unknown>> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.reviseSlideStyle(task, currentBrief, feedback)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'decide-slide-layouts',
    async (_event, task: string, slides: LayoutDecisionInput[]): Promise<LayoutDecision[]> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.decideSlideLayouts(task, slides)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'generate-slide-notes',
    async (_event, task: string, backgroundText: string, slides: SlideNoteInput[]): Promise<SlideNote[]> => {
      try {
        const settings = getSettings()
        const provider = createProvider(resolveActiveConfig(settings))
        return await provider.generateSlideNotes(task, backgroundText, slides)
      } catch (error) {
        throw new Error(describeError(error))
      }
    }
  )

  ipcMain.handle(
    'qa-check-slide-image',
    async (_event, imageBase64: string, expectedText: string[], referenceImageBase64?: string, outlineContext?: string): Promise<{ ok: boolean; note: string }> => {
      const settings = getSettings()
      const resolved = resolveVisionQaConfig(settings)
      if (!resolved) return { ok: true, note: '未配置识图质检服务，已跳过' }
      try {
        return resolved.protocol === 'anthropic'
          ? await checkWithAnthropic(resolved.config, imageBase64, expectedText, referenceImageBase64, outlineContext)
          : await checkWithOpenAI(resolved.config, imageBase64, expectedText, referenceImageBase64, outlineContext)
      } catch (error) {
        return { ok: true, note: `质检调用失败，已跳过（${describeError(error)}）` }
      }
    }
  )
}
