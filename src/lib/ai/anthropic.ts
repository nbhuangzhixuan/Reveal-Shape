import Anthropic from '@anthropic-ai/sdk'
import type {
  AIProviderConfig,
  AnsweredQuestion,
  FiveWTwoHDraft,
  LayoutDecision,
  LayoutDecisionInput,
  NodeRewriteResult,
  RestructureDraft,
  SlideNote,
  SlideNoteInput,
  TreeNodeBatch,
  UnderstandingQuestionDraft,
  UnderstandingSynthesis
} from '@shared/index'
import type { AIProvider, StyleRecommendation, TreePathNode } from './types'
import { BUILTIN_SLIDE_STYLES } from '../styleLibrary'
import {
  DECIDE_LAYOUTS_SYSTEM_PROMPT,
  GENERATE_NOTES_SYSTEM_PROMPT,
  RESTRUCTURE_SYSTEM_PROMPT,
  REVISE_STYLE_SYSTEM_PROMPT,
  SLIDE_STYLE_SYSTEM_PROMPT,
  TREE_SYSTEM_PROMPT,
  UNDERSTANDING_SYSTEM_PROMPT,
  buildDecideLayoutsPrompt,
  buildDeriveRestructurePrompt,
  buildGenerateChildrenPrompt,
  buildGenerateNotesPrompt,
  buildRefineRestructurePrompt,
  buildRefineUnderstandingPrompt,
  buildRewriteNodePrompt,
  buildReviseStylePrompt,
  buildSelectQuestionsPrompt,
  buildSlideStylePrompt,
  buildSynthesizePrompt,
  parseJSONArray,
  parseJSONObject
} from './prompts'

const DEFAULT_MODEL = 'claude-opus-4-8'

export function createAnthropicProvider(config: AIProviderConfig): AIProvider {
  const client = new Anthropic({
    apiKey: config.apiKey,
    baseURL: config.baseUrl
  })
  const model = config.model || DEFAULT_MODEL

  async function chat(system: string, user: string): Promise<string> {
    const response = await client.messages.create({
      model,
      max_tokens: 4096,
      system,
      messages: [{ role: 'user', content: user }]
    })

    const text = response.content
      .filter((block): block is Anthropic.TextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('')

    if (!text) {
      throw new Error('Claude 未返回文本内容')
    }
    return text
  }

  return {
    async selectUnderstandingQuestions(task: string, referenceText?: string): Promise<UnderstandingQuestionDraft[]> {
      const raw = await chat(UNDERSTANDING_SYSTEM_PROMPT, buildSelectQuestionsPrompt(task, referenceText))
      return parseJSONArray<UnderstandingQuestionDraft>(raw)
    },
    async synthesizeUnderstanding(task: string, answered: AnsweredQuestion[], referenceText?: string): Promise<UnderstandingSynthesis> {
      const raw = await chat(UNDERSTANDING_SYSTEM_PROMPT, buildSynthesizePrompt(task, answered, referenceText))
      return parseJSONObject<UnderstandingSynthesis>(raw)
    },
    async refineUnderstanding(task: string, current: UnderstandingSynthesis, feedback: string): Promise<UnderstandingSynthesis> {
      const raw = await chat(UNDERSTANDING_SYSTEM_PROMPT, buildRefineUnderstandingPrompt(task, current, feedback))
      return parseJSONObject<UnderstandingSynthesis>(raw)
    },
    async deriveRestructure(task: string, understanding: FiveWTwoHDraft): Promise<RestructureDraft> {
      const raw = await chat(RESTRUCTURE_SYSTEM_PROMPT, buildDeriveRestructurePrompt(task, understanding))
      return parseJSONObject<RestructureDraft>(raw)
    },
    async refineRestructure(task: string, current: RestructureDraft, feedback: string): Promise<RestructureDraft> {
      const raw = await chat(RESTRUCTURE_SYSTEM_PROMPT, buildRefineRestructurePrompt(task, current, feedback))
      return parseJSONObject<RestructureDraft>(raw)
    },
    async generateChildren(
      task: string,
      understanding: FiveWTwoHDraft,
      restructure: RestructureDraft,
      path: TreePathNode[],
      feedback?: string
    ): Promise<TreeNodeBatch> {
      const raw = await chat(TREE_SYSTEM_PROMPT, buildGenerateChildrenPrompt(task, understanding, restructure, path, feedback))
      return parseJSONObject<TreeNodeBatch>(raw)
    },
    async rewriteNode(
      task: string,
      understanding: FiveWTwoHDraft,
      restructure: RestructureDraft,
      path: TreePathNode[],
      siblings: TreePathNode[],
      feedback: string
    ): Promise<NodeRewriteResult> {
      const raw = await chat(TREE_SYSTEM_PROMPT, buildRewriteNodePrompt(task, understanding, restructure, path, siblings, feedback))
      return parseJSONObject<NodeRewriteResult>(raw)
    },
    async recommendSlideStyles(task: string, backgroundText: string): Promise<StyleRecommendation[]> {
      const availableStyles = BUILTIN_SLIDE_STYLES.map((s) => ({ name: s.name, scenarios: s.scenarios }))
      const raw = await chat(SLIDE_STYLE_SYSTEM_PROMPT, buildSlideStylePrompt(task, backgroundText, availableStyles))
      return parseJSONArray<StyleRecommendation>(raw)
    },
    async reviseSlideStyle(task: string, currentBrief: Record<string, unknown>, feedback: string): Promise<Record<string, unknown>> {
      const raw = await chat(REVISE_STYLE_SYSTEM_PROMPT, buildReviseStylePrompt(task, currentBrief, feedback))
      return parseJSONObject<Record<string, unknown>>(raw)
    },
    async decideSlideLayouts(task: string, slides: LayoutDecisionInput[]): Promise<LayoutDecision[]> {
      const raw = await chat(DECIDE_LAYOUTS_SYSTEM_PROMPT, buildDecideLayoutsPrompt(task, slides))
      return parseJSONArray<LayoutDecision>(raw)
    },
    async generateSlideNotes(task: string, backgroundText: string, slides: SlideNoteInput[]): Promise<SlideNote[]> {
      const raw = await chat(GENERATE_NOTES_SYSTEM_PROMPT, buildGenerateNotesPrompt(task, backgroundText, slides))
      return parseJSONArray<SlideNote>(raw)
    }
  }
}
