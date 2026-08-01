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

export interface TreePathNode {
  title: string
  description?: string
}

export interface AIProvider {
  selectUnderstandingQuestions(task: string, referenceText?: string): Promise<UnderstandingQuestionDraft[]>
  synthesizeUnderstanding(task: string, answered: AnsweredQuestion[], referenceText?: string): Promise<UnderstandingSynthesis>
  refineUnderstanding(task: string, current: UnderstandingSynthesis, feedback: string): Promise<UnderstandingSynthesis>
  deriveRestructure(task: string, understanding: FiveWTwoHDraft): Promise<RestructureDraft>
  refineRestructure(task: string, current: RestructureDraft, feedback: string): Promise<RestructureDraft>
  generateChildren(
    task: string,
    understanding: FiveWTwoHDraft,
    restructure: RestructureDraft,
    path: TreePathNode[],
    feedback?: string
  ): Promise<TreeNodeBatch>
  // 改写单个节点自己的内容（标题/描述）——prompt 会给全量上下文让 AI 看懂全局，
  // 但输出被锁死为目标节点的两个字段，代码端只接受这一个节点的补丁，杜绝连带修改
  rewriteNode(
    task: string,
    understanding: FiveWTwoHDraft,
    restructure: RestructureDraft,
    path: TreePathNode[],
    siblings: TreePathNode[],
    feedback: string
  ): Promise<NodeRewriteResult>
  // 从内置风格库（BUILTIN_SLIDE_STYLES）里选 3 个最适合这份内容的，返回风格名 + 一句话理由；
  // 不让模型生成风格 JSON 本身，只做"选择"，规避临场生成长 JSON 容易出错（引号不配对等）的问题，
  // 也保证生图效果贴近参考 skill 人工写好的风格库
  recommendSlideStyles(task: string, backgroundText: string): Promise<StyleRecommendation[]>
  // 样张反馈处理——对齐参考 skill 的原文做法（outline-style-and-sample.md）："revise the style description
  // and regenerate"：不是把反馈文字临时拼进这一次的生图 prompt，而是先把反馈实际改写进风格 JSON 本身，
  // 再拿改写后的风格重新生成样张；这样反馈的效果会延续到后面所有页，"保存风格"存的也是改过的那份
  reviseSlideStyle(task: string, currentBrief: Record<string, unknown>, feedback: string): Promise<Record<string, unknown>>
  // 对齐参考 skill 的做法（slide-generation-and-subagents.md）："choose a layout that fits its content
  // and explain that choice in the layout.intent field"——版式要在准备大纲阶段就决定好，不能让生图模型
  // 自己现场从候选清单里挑；这一步能看到全篇所有 content 页的标题和要点，可以有意识地"页与页之间错开版式"
  // （skill 的 variation_rule），不是只看单页内容孤立判断
  decideSlideLayouts(task: string, slides: LayoutDecisionInput[]): Promise<LayoutDecision[]>
  // 对齐参考 skill 的做法（project-assembly-and-reporting.md 的 Speaker Notes 一节）：讲稿要按统一的
  // 讲述风格、演讲者第一人称口吻写，且要看得到全篇大纲才能写好过渡句和"承接上一页"的语气，
  // 所以跟版式决策一样是一次批量调用，不是逐页单独生成
  generateSlideNotes(task: string, backgroundText: string, slides: SlideNoteInput[]): Promise<SlideNote[]>
}

export interface StyleRecommendation {
  name: string
  reason: string
  recommended: boolean
}

export type AIProviderFactory = (config: AIProviderConfig) => AIProvider
