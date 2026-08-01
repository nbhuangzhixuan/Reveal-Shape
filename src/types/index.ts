export interface TreeNode {
  id: string
  title: string
  description?: string
  children: TreeNode[]
  isLeaf: boolean
  confirmed: boolean
  isLoading: boolean
  // 这个节点的子节点之间是否有先后顺序（true=按顺序做，false=互不依赖的并列分组）
  childrenSequential?: boolean
  // 呈现阶段用户手动补的图（比如"这一点实际用了什么技术"的截图/示意图）——原样存成 data URL，
  // 跟生成的幻灯片图片走的是同一套 base64 存储方式；生成 PPT 时会作为"必须保留原样"的输入图
  // 传给生图模型，不是让模型照着这张图重新画一张类似的
  imageDataUrl?: string
  // 配的图对应的图注——生成 PPT 时会跟这张图一起传给生图 prompt，让画面里图片旁边能带上说明文字，
  // 不是只有图片本身孤零零地贴在画面里
  imageCaption?: string
  // 生成 PPT 时，这个节点是不是要另起一页——默认同一分支下的所有子节点合并成一页 PPT
  // （每个子节点标题变成页面上的一条要点），标了这个之后，从这个节点开始另开一页，
  // 跟它同分支、排在它前面的兄弟节点还是合并在上一页。挂在子节点自己身上（不是父节点），
  // 这样删除/新增兄弟节点时不需要额外维护"第几个节点后面要分页"这种脆弱的位置引用
  pageBreakBefore?: boolean
}

export interface TreeNodeDraft {
  title: string
  description?: string
  isLeaf: boolean
}

// 一批同层子节点的生成结果：内容本身 + 这批节点之间是并列还是先后
export interface TreeNodeBatch {
  children: TreeNodeDraft[]
  sequential: boolean
}

// AI 改写单个节点自身内容的结果——只允许返回目标节点的标题和描述两个字段，
// 不返回子节点数组，保证"改一个节点只动一个节点"（prompt 里给了全局上下文，
// 但输出作用域被锁死在这个节点的这两个字段上）
export interface NodeRewriteResult {
  title: string
  description?: string
}

// PPT 生成前的一个候选视觉风格方案——生成样图之前先让用户从几个方案里选一个。
// brief 是完整的风格 JSON（色值、版式规则、禁止事项等，跟参考 skill 的 references/*.md 同构），
// 会原样嵌入生图 prompt 的"Global Style"区块；description 只是给 UI 展示用的一句话场景说明，不参与生图
export interface SlideStyleOption {
  name: string
  description: string
  recommended: boolean
  brief: Record<string, unknown>
}

// 用户存进个人风格库的一份风格——跟 SlideStyleOption 同构（去掉 recommended），多存一个保存时间；
// 存起来之后下次生成 PPT 可以直接在风格选择这一步选它，不用每次都重新让 AI 现场提议
export interface SavedSlideStyle {
  name: string
  description: string
  brief: Record<string, unknown>
  savedAt: number
}

// PPT 生成大纲里的一页——跟 src/lib/export/slideOutline.ts 的 SlideSpec 是同一份形状，
// 定义在这里（而不是反过来在 slideOutline.ts 里 import type 到这个文件）是为了让 PptxExportSession
// 可以引用它，同时不引入"types 依赖 lib"的循环
export interface SlideSpecShape {
  kind: 'cover' | 'toc' | 'section' | 'content' | 'closing'
  title: string
  keyPoints: string[]
  supportingText?: string
  sequential?: boolean
  sectionNumber?: string
  deckContext?: string
  // 跟参考 skill 的 layout.composition/layout.intent 保持一致：具体版式在准备大纲阶段就提前决定好，
  // 写进这里，生图时只是执行这个已经定好的版式，不再让生图模型自己现场从候选清单里挑
  layout?: { composition: string; intent: string }
  // 对齐参考 skill 的做法（user-supplied-assets.md）：用户手动补的图（节点上传的截图/示意图）
  // 是"必须原样保留内容的输入图"，不是让生图模型照着重新画一张类似的——这里只记路数据，
  // label 是这张图对应哪条要点，帮生图 prompt 能把图和文字对应起来
  requiredImages?: { label: string; imageDataUrl: string; caption?: string }[]
  // 只有 kind === 'content' 时才有意义：跟 keyPoints 一一对应，记录每条要点背后真实的树节点 id，
  // 让大纲确认界面能反过来找到对应的 TreeNode，拖拽调整要点分页时知道具体在挪哪个节点
  keyPointNodeIds?: string[]
  // section/content 两种页面共用同一个分支（TreeNode），这里记这个分支自己的 id——
  // 大纲确认界面拖拽调整分页时用它判断"这几张卡片是不是同一节"，跨节的拖拽不允许
  branchNodeId?: string
}

// 版式决策的输入/输出——决策发生在准备大纲阶段（能看到全篇所有 content 页），
// 不是留给生图模型自己现场从候选清单里挑
export interface LayoutDecisionInput {
  index: number
  title: string
  keyPoints: string[]
  sequential: boolean
  // 对齐参考 skill 的例子（prepare_slide_prompts.py 模板里 "source figure left, explanation cards right"）：
  // 版式要围绕"哪几条要点自带真实素材图"来设计——有图的那条应该分配更大的画面空间放真实图片，
  // 其余没有图的要点用简洁小卡片处理，不是不知道图片存在、把画面平均分给每条要点
  keyPointsWithImage?: string[]
}

export interface LayoutDecision {
  index: number
  composition: string
  intent: string
}

// 讲稿生成的输入/输出——对齐参考 skill 的 speech.md 要求："make sure ... assembly writes those notes
// into the PPT"。这里不落地一份 speech.md 文件，而是直接把讲稿文本写进 pptx 每一页的备注栏，
// 效果等价（skill 本身也是靠 assemble_ppt.py 读 speech.md 写进 PPT 备注栏，落地文件只是中间形式）
export interface SlideNoteInput {
  index: number
  kind: SlideSpecShape['kind']
  title: string
  keyPoints: string[]
}

export interface SlideNote {
  index: number
  notes: string
}

// PPT 生成进度落盘用——每成功生成一页就写一次，这样即使渲染进程被重建（开发模式 HMR 整页重载、
// 意外关闭、系统睡眠唤醒后被判定无响应等）也不会丢生成进度，重新打开能接着生成而不是悄悄回到空白状态
export interface PptxExportSession {
  planId: string
  savePath: string
  outline: SlideSpecShape[]
  selectedStyle: SlideStyleOption | null
  // selectedStyle 有没有被样张反馈实际改写过——决定恢复会话后要不要提示"存起来"，
  // 不随会话持久化的话，恢复会话时会静默丢失，即使风格确实被改过也不会再提示保存
  styleModified: boolean
  // 样张用的是大纲里第几页——不一定是 0（样张优先选一页内容页，而不是信息密度很低的封面页）
  sampleIndex: number
  // 已经成功生成的图片，[大纲下标, base64][]，不保证连续（比如样张下标可能不是 0）
  images: [number, string][]
  qaResults: [number, { ok: boolean; note: string }][]
  // 每页的讲稿文本，[大纲下标, 讲稿][]——生成一次就覆盖全篇，恢复会话时不用重新生成
  notes: [number, string][]
  updatedAt: number
}

export type Phase = 'idle' | 'understand' | 'restructure' | 'present'

export type FiveWTwoHKey = 'what' | 'why' | 'who' | 'when' | 'where' | 'how' | 'howMuch'

export interface FiveWTwoHItem {
  value: string
  source: 'user' | 'ai'
}

export type FiveWTwoHDraft = Record<FiveWTwoHKey, FiveWTwoHItem>

export interface UnderstandingQuestion {
  key: FiveWTwoHKey
  question: string
  answer: string | null
  skipped: boolean
}

export type UnderstandingStatus = 'selecting' | 'asking' | 'synthesizing' | 'reviewing'

export interface Understanding {
  status: UnderstandingStatus
  questions: UnderstandingQuestion[]
  currentIndex: number
  draft: FiveWTwoHDraft | null
  summary: string | null
  confirmed: boolean
}

export interface UnderstandingSynthesis {
  draft: FiveWTwoHDraft
  summary: string
}

export interface RestructureDraft {
  audience: string
  behavior: string
  situation: string
  complication: string
  question: string
  answer: string
  theme: string
  audienceQuestion: string
}

export interface Restructure {
  draft: RestructureDraft | null
  confirmed: boolean
}

export interface UnderstandingQuestionDraft {
  key: FiveWTwoHKey
  question: string
}

export interface AnsweredQuestion {
  key: FiveWTwoHKey
  question: string
  answer: string | null
}

export interface Plan {
  id: string
  task: string
  root: TreeNode | null
  phase: Phase
  understanding?: Understanding
  restructure?: Restructure
  referenceText?: string
  createdAt: number
  updatedAt: number
}

export type AIProviderName = 'openai' | 'anthropic' | 'deepseek' | 'custom'

export interface AIProviderConfig {
  provider: AIProviderName
  apiKey: string
  model?: string
  baseUrl?: string
  // 只有 provider 是 custom 时才有意义——决定跟这个第三方服务用 OpenAI 协议还是 Anthropic 协议对话
  protocol?: 'openai' | 'anthropic'
}

export interface AppSettings {
  activeProvider: AIProviderName
  providers: Partial<Record<AIProviderName, AIProviderConfig>>
  imageProvider?: ImageProviderConfig
  // 用于 PPT 生成后的看图质检——只有 activeProvider 是 deepseek（不支持识图）时才需要用户单独填，
  // 是 openai/anthropic 时直接复用 providers[activeProvider] 那份 Key，不需要这个字段
  visionQaProvider?: AIProviderConfig
}

// 生成 PPT 用的图像生成配置，跟文字对话模型（AIProviderConfig）完全独立——两者可能是不同的第三方服务
export interface ImageProviderConfig {
  apiKey: string
  model: string
  baseUrl?: string
  resolution?: ImageResolution
}

// 跟参考 skill 的 image_gen.py 保持一致：默认档是 2560x1440/medium（skill 的 DEFAULT_SIZE/DEFAULT_QUALITY），
// 4K 档是 3840x2160/high，只在"文字密集页需要更清晰、或默认结果模糊"时才升级——
// 之前自己发明的 1K 档（1024x576）低于 gpt-image-2 官方最小像素限制（655,360px），是无效尺寸，已去掉
export type ImageResolution = '2k' | '4k'
