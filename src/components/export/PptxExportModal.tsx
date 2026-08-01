import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react'
import { motion } from 'framer-motion'
import { AlertCircle, CheckCircle2, GripVertical, Loader2, Send, X } from 'lucide-react'
import type { Plan, PptxExportSession, SavedSlideStyle, SlideStyleOption } from '@shared/index'
import { sanitizeFilename } from '../../lib/export/download'
import { buildPptxArrayBuffer } from '../../lib/export/pptx'
import { buildSlideImagePrompt, type PromptImageRef } from '../../lib/export/slidePrompt'
import { buildBackgroundText, buildOutlineContextForQa, buildSlideOutline, pickSampleIndex, type SlideSpec } from '../../lib/export/slideOutline'

interface PptxExportModalProps {
  plan: Plan
  onClose: () => void
  onMoveKeyPointNode: (branchId: string, nodeId: string, afterNodeId: string | null, startsNewPage: boolean) => void
}

// 大纲确认这一步，把扁平的 outline 数组重新组织成"章节块"方便渲染拖拽界面——一个章节块包含
// 它的 section 分隔页 + 这一节下面已经拆好的所有内容页（"卡片"）。buildSlideOutline 总是先发出
// section 页、紧接着发出它对应的一到多张 content 页，所以直接顺序扫一遍就能还原出这个分组，
// 不需要重新遍历树
type OutlineBlock =
  | { kind: 'simple'; index: number; spec: SlideSpec }
  | { kind: 'section'; sectionSpec: SlideSpec; cards: { index: number; spec: SlideSpec }[] }

function groupOutlineForReview(outline: SlideSpec[]): OutlineBlock[] {
  const blocks: OutlineBlock[] = []
  outline.forEach((spec, index) => {
    if (spec.kind === 'section') {
      blocks.push({ kind: 'section', sectionSpec: spec, cards: [] })
      return
    }
    if (spec.kind === 'content') {
      const last = blocks[blocks.length - 1]
      if (last?.kind === 'section') {
        last.cards.push({ index, spec })
        return
      }
    }
    blocks.push({ kind: 'simple', index, spec })
  })
  return blocks
}

// 两张卡片之间（或一节最前面）的放下目标——拆页操作发生在这里。
// 重要：这个元素的尺寸和结构必须从头到尾保持不变，不能随"是否在拖拽"而突然出现/消失或变大变小——
// 之前踩过一次坑：让它在拖拽开始的瞬间从"几乎不存在"跳变成"一个带文字的大框"，这个尺寸跳变正好
// 发生在浏览器刚开始追踪这次拖拽的那一刻，会把拖拽操作直接打断（表现为"拖不动"，且不会报错）。
// 所以这里只用颜色/边框样式（不影响布局的属性）来区分"平时"和"拖拽中"这两种状态，尺寸永远不变
function DropGap({ dragging, active, onDragOver, onDragLeave, onDrop }: {
  dragging: boolean
  active: boolean
  onDragOver?: (e: DragEvent<HTMLDivElement>) => void
  onDragLeave?: (e: DragEvent<HTMLDivElement>) => void
  onDrop?: (e: DragEvent<HTMLDivElement>) => void
}) {
  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={`flex h-5 items-center justify-center rounded border text-[10px] font-medium transition-colors ${
        active
          ? 'border-blue-400 bg-blue-100 text-blue-600'
          : dragging
            ? 'border-dashed border-blue-300 bg-blue-50/60 text-blue-400'
            : 'border-dashed border-neutral-200 text-transparent'
      }`}
    >
      拆成新的一页
    </div>
  )
}

type Status =
  | 'checking-session'
  | 'resume-prompt'
  | 'choosing-path'
  | 'outline-review'
  | 'style-loading'
  | 'style-selecting'
  | 'sample-generating'
  | 'sample-review'
  | 'generating'
  | 'done'
  | 'error'

interface QaResult {
  ok: boolean
  note: string
}

export function PptxExportModal({ plan, onClose, onMoveKeyPointNode }: PptxExportModalProps) {
  const [status, setStatus] = useState<Status>('checking-session')
  const [current, setCurrent] = useState(0)
  const [total, setTotal] = useState(0)
  // 检测到有未完成的会话，但对应的树内容已经被改过（大纲过时）——提示一下已作废的进度，而不是悄悄清掉，
  // 毕竟已经生成的那些图是花过钱的
  const [staleSessionDiscarded, setStaleSessionDiscarded] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [previewImage, setPreviewImage] = useState<string | null>(null)
  const [savePath, setSavePath] = useState<string | null>(null)
  const [outline, setOutline] = useState<SlideSpec[]>([])
  // 大纲确认这一步，正在拖拽的是哪个要点（子节点）——存在 state 里而不是只靠 dataTransfer，
  // 因为放下时要校验"跨节拖拽不允许"，光靠 dataTransfer.getData 在某些浏览器的 dragover 阶段读不到值
  const [draggingKeyPoint, setDraggingKeyPoint] = useState<{ branchNodeId: string; nodeId: string } | null>(null)
  // 鼠标当前悬停在哪个"放下目标"上——用来给放下位置画一条高亮的插入线，不悬停时是 null
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null)
  const [styleOptions, setStyleOptions] = useState<SlideStyleOption[]>([])
  const [savedStyles, setSavedStyles] = useState<SavedSlideStyle[]>([])
  const [selectedStyle, setSelectedStyle] = useState<SlideStyleOption | null>(null)
  const [sampleImage, setSampleImage] = useState<string | null>(null)
  const [sampleFeedback, setSampleFeedback] = useState('')
  // error 页"重试"按钮具体该重新执行哪个函数——用"直接记录要重试的动作"取代"用 styleOptions/images 状态猜"，
  // 因为光靠状态猜会猜错：比如"风格已经改写成功、只是重新生成样张这一步失败了"，此时 styleOptions 不是空、
  // images 也不是空（旧样张还在），猜测逻辑会误判成"该批量生成剩余页"，而实际应该是"再生成一次样张"
  const retryActionRef = useRef<(() => void) | null>(null)
  const [qaResults, setQaResults] = useState<Map<number, QaResult>>(new Map())
  const [resumableSession, setResumableSession] = useState<PptxExportSession | null>(null)
  const [saveStyleName, setSaveStyleName] = useState('')
  const [styleSaved, setStyleSaved] = useState(false)
  // 对齐参考 skill 的做法（style-library.md）："ask whether to overwrite, merge, or choose a new name"——
  // 同名时不直接静默覆盖，先让用户确认
  const [pendingOverwriteName, setPendingOverwriteName] = useState<string | null>(null)
  // 对齐参考 skill 的做法（project-assembly-and-reporting.md 最终报告要求如实汇报"Any slides that were
  // regenerated"）：不管重新生成后质检有没有通过，"这一页被重新生成过"本身是个值得让用户知道的事实——
  // 这跟"当前质检是否失败"（qaResults，随每次重新生成覆盖）是两件独立的事，qaResults 通过了不代表
  // 这一页从没出过问题、不值得复核；样张被重新生成还额外意味着其它页可能跟着不统一，单独标一下
  const [regeneratedIndices, setRegeneratedIndices] = useState<Set<number>>(new Set())
  const [sampleRegeneratedAfterOthers, setSampleRegeneratedAfterOthers] = useState(false)
  const startedRef = useRef(false)
  const slidesRef = useRef<SlideSpec[]>([])
  const sampleIndexRef = useRef(0)
  const currentRequestIdRef = useRef<string>('')
  const selectedStyleRef = useRef<SlideStyleOption | null>(null)
  // 对齐参考 skill 的做法（project-assembly-and-reporting.md）："Skip this tip when the deck used an
  // unmodified built-in style"——只有风格被样张反馈实际改过，才提示"存起来"，原封不动用内置风格库时不提示
  const styleModifiedRef = useRef(false)
  const savePathRef = useRef<string | null>(null)
  const qaResultsRef = useRef<Map<number, QaResult>>(new Map())
  // 已经成功生成的图片，key 是大纲下标——样张不一定是下标 0（优先选内容页做样张），所以不能用连续数组
  const imagesRef = useRef<Map<number, string>>(new Map())
  // 对齐参考 skill 的做法（project-assembly-and-reporting.md 的 Speaker Notes 一节）：讲稿一次性覆盖全篇生成，
  // 不随会话中断重新生成——只要生成过一次就一直复用，跟 imagesRef 一样落盘持久化
  const notesRef = useRef<Map<number, string>>(new Map())

  // 每成功生成一页就落一次盘（存到本地设置文件，不是 pptx 本身）：即使渲染进程被重建
  // （开发模式 HMR 整页重载、意外关闭、系统睡眠唤醒后被判无响应等），重新打开这份计划的生成 PPT
  // 也能看到"上次生成到第几页"，而不是什么都没发生过一样静默回到空白状态
  const persistSession = () => {
    const path = savePathRef.current
    if (!path) return
    const session: PptxExportSession = {
      planId: plan.id,
      savePath: path,
      outline: slidesRef.current,
      selectedStyle: selectedStyleRef.current,
      styleModified: styleModifiedRef.current,
      sampleIndex: sampleIndexRef.current,
      images: Array.from(imagesRef.current.entries()),
      qaResults: Array.from(qaResultsRef.current.entries()),
      notes: Array.from(notesRef.current.entries()),
      updatedAt: Date.now()
    }
    window.api.savePptxExportSession(session)
  }

  const setQaResult = (index: number, qa: QaResult) => {
    qaResultsRef.current.set(index, qa)
    setQaResults(new Map(qaResultsRef.current))
  }

  const startFresh = async () => {
    setStatus('choosing-path')
    const path = await window.api.chooseSavePath(`${sanitizeFilename(plan.task)}.pptx`, [
      { name: 'PowerPoint', extensions: ['pptx'] }
    ])
    if (!path) {
      onClose()
      return
    }
    setSavePath(path)
    savePathRef.current = path
    const slides = buildSlideOutline(plan)
    slidesRef.current = slides
    sampleIndexRef.current = pickSampleIndex(slides)
    setOutline(slides)
    setTotal(slides.length)
    setStatus('outline-review')
  }

  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true

    ;(async () => {
      window.api.getSavedSlideStyles().then(setSavedStyles)

      const session = await window.api.getPptxExportSession(plan.id)
      // 大纲已经跟不上当前树的内容了（用户关掉弹窗后回去编辑过节点、重新展开过某一层等）——
      // 直接比对大纲内容本身，而不是 plan.updatedAt：updatedAt 会被"切换到呈现阶段"这类跟树内容
      // 无关的操作刷新，用它做代理指标会误判，比对大纲实际文字内容才是准确的。
      // 注意：比对时要去掉 layout 字段——它是大纲确认之后才由 AI 决定、写回大纲的，不是从树内容
      // 派生出来的，新鲜 buildSlideOutline(plan) 永远不会带 layout，直接比对整份大纲会让所有
      // 已经走过版式决策的会话被误判成"过时"
      const stripLayout = (specs: SlideSpec[]) => specs.map(({ layout: _layout, ...rest }) => rest)
      const outlineStale = session && JSON.stringify(stripLayout(session.outline)) !== JSON.stringify(stripLayout(buildSlideOutline(plan)))
      if (session && session.images.length > 0 && !outlineStale) {
        setResumableSession(session)
        setStatus('resume-prompt')
        return
      }
      if (session) {
        // 有会话记录但一张图都没成功生成过（比如卡在选风格那一步），或者大纲已经过时，都没什么值得接续的
        if (outlineStale && session.images.length > 0) setStaleSessionDiscarded(true)
        await window.api.clearPptxExportSession(plan.id)
      }
      await startFresh()
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 订阅生图过程中的阶段性预览图——只在 requestId 对上当前这一页时才展示，避免上一页的迟到事件串页
  useEffect(() => {
    return window.api.onSlideImageProgress((requestId, partialImage) => {
      if (requestId === currentRequestIdRef.current) setPreviewImage(partialImage)
    })
  }, [])

  // 每次开始生成一页时清零重计和预览图，让用户能看到"这一页已经等了多久"
  useEffect(() => {
    if (status !== 'generating' && status !== 'sample-generating') return
    setElapsed(0)
    setPreviewImage(null)
    const timer = setInterval(() => setElapsed((s) => s + 1), 1000)
    return () => clearInterval(timer)
  }, [status, current])

  // 还在大纲确认这一步时，用户在这个界面上点了"拆成两页"/"合并"——这些操作是直接改 plan.root
  // 本身（跟树视图里点字改标题走的是同一份数据），所以这里要跟着 plan.root 重新算一遍大纲，
  // 让拆页/合并的效果立刻显示出来，不需要关掉重开这个弹窗才能看到新结果
  useEffect(() => {
    if (status !== 'outline-review') return
    const slides = buildSlideOutline(plan)
    slidesRef.current = slides
    sampleIndexRef.current = pickSampleIndex(slides)
    setOutline(slides)
    setTotal(slides.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan.root, status])

  // 按大纲下标顺序把已生成的图片（连同对应的讲稿，如果有）排出来，用于写 pptx 文件——中间可能有空洞
  // （还没生成的页），空洞暂时跳过，pptx 只包含已经成功生成的页，等全部生成完才是完整的
  const orderedImagesAndNotes = (): { images: string[]; notes: (string | undefined)[] } => {
    const images: string[] = []
    const notes: (string | undefined)[] = []
    for (let i = 0; i < slidesRef.current.length; i++) {
      const image = imagesRef.current.get(i)
      if (image) {
        images.push(image)
        notes.push(notesRef.current.get(i))
      }
    }
    return { images, notes }
  }

  const generateOne = async (spec: SlideSpec, index: number, feedback?: string): Promise<string> => {
    // 样张之外的每一页都把已批准的样张图片传回去做视觉风格参照，让模型"看图保风格"而不是只靠文字描述，
    // 这样才能真正保证整份 PPT 风格统一；样张自己（重新）生成时不能传自己当参照——
    // 尤其是带着反馈重新生成样张时，imagesRef 里存的还是刚被用户否决的上一版，拿它当"照着画"的参照
    // 会跟这次的反馈方向直接矛盾
    const referenceImage = index === sampleIndexRef.current ? undefined : imagesRef.current.get(sampleIndexRef.current)

    // 按顺序拼输入图数组：风格参照在前，用户手动补的素材图在后——顺序必须跟传给 buildSlideImagePrompt
    // 的 imageRefs 完全一致，这样 prompt 里"Image 1/Image 2"的文字编号才能对上真正传的是哪张图
    const imageRefs: PromptImageRef[] = []
    const inputImages: string[] = []
    if (referenceImage) {
      imageRefs.push({ role: 'style-reference' })
      inputImages.push(referenceImage)
    }
    for (const required of spec.requiredImages ?? []) {
      imageRefs.push({ role: 'required-asset', label: required.label, caption: required.caption })
      inputImages.push(required.imageDataUrl)
    }

    const prompt = buildSlideImagePrompt(spec, selectedStyleRef.current?.brief, feedback, imageRefs)
    const requestId = crypto.randomUUID()
    currentRequestIdRef.current = requestId
    return window.api.generateSlideImage(prompt, requestId, inputImages)
  }

  // 大纲确认这一步的拖拽——拖起某条要点（子节点）
  const handleKeyPointDragStart = (branchNodeId: string, nodeId: string) => (e: DragEvent) => {
    setDraggingKeyPoint({ branchNodeId, nodeId })
    // dataTransfer 也带一份同样的信息，纯粹是让浏览器认为这是一次合法的拖拽（部分浏览器要求
    // dragstart 必须调用 setData 才会真正进入拖拽状态）；真正做校验和移动用的是上面的 state
    e.dataTransfer.setData('text/plain', nodeId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleKeyPointDragEnd = () => {
    setDraggingKeyPoint(null)
    setDragOverTarget(null)
  }

  // targetKey 只用来控制"放下位置高亮线"显示在哪个插入点上，不参与实际的移动逻辑
  const handleDragOverTarget = (targetKey: string, branchNodeId: string) => (e: DragEvent) => {
    if (!draggingKeyPoint || draggingKeyPoint.branchNodeId !== branchNodeId) return // 跨节拖拽不允许
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverTarget(targetKey)
  }

  const handleDragLeaveTarget = (targetKey: string) => () => {
    setDragOverTarget((cur) => (cur === targetKey ? null : cur))
  }

  // 放到某条要点后面，合并到它所在的那一页（startsNewPage=false）
  const handleDropAfterKeyPoint = (branchNodeId: string, afterNodeId: string) => (e: DragEvent) => {
    e.preventDefault()
    if (draggingKeyPoint && draggingKeyPoint.branchNodeId === branchNodeId && draggingKeyPoint.nodeId !== afterNodeId) {
      onMoveKeyPointNode(branchNodeId, draggingKeyPoint.nodeId, afterNodeId, false)
    }
    setDraggingKeyPoint(null)
    setDragOverTarget(null)
  }

  // 放到两张卡片中间的空白处，从这里另起一页（startsNewPage=true）；afterNodeId 为 null 表示
  // 挪到这一节最前面（拖到第一张卡片上方那道缝隙）。afterNodeId 等于正在拖的节点自己时（比如把
  // 卡片里最后一条要点拖到它自己卡片正下方那道缝隙），不是"什么都不做"——这是有意义的操作：
  // 让它原地单独成一页，位置不变，只改翻页标记，moveKeyPointNode 会识别这种情况并正确处理
  const handleDropBetweenCards = (branchNodeId: string, afterNodeId: string | null) => (e: DragEvent) => {
    e.preventDefault()
    if (draggingKeyPoint && draggingKeyPoint.branchNodeId === branchNodeId) {
      onMoveKeyPointNode(branchNodeId, draggingKeyPoint.nodeId, afterNodeId, true)
    }
    setDraggingKeyPoint(null)
    setDragOverTarget(null)
  }

  const loadStyleOptions = async () => {
    setStatus('style-loading')
    setError(null)
    try {
      const options = await window.api.proposeSlideStyles(plan.task, buildBackgroundText(plan))
      setStyleOptions(options)
      const recommended = options.find((o) => o.recommended) ?? options[0] ?? null
      setSelectedStyle(recommended)
      setStatus('style-selecting')
    } catch (err) {
      retryActionRef.current = loadStyleOptions
      setStatus('error')
      setError(err instanceof Error ? err.message : '获取风格方案失败，请稍后重试')
    }
  }

  // 对齐参考 skill 的做法（slide-generation-and-subagents.md）：版式要在准备大纲阶段就提前决定好，
  // 不能留给生图模型自己现场从候选清单里挑；这一步能看到全篇所有 content 页，可以让相邻页版式错开。
  // 放在大纲确认之后、选风格之前——版式跟具体视觉风格无关，不需要等风格选完
  const confirmOutline = async () => {
    setStatus('style-loading')
    setError(null)
    try {
      const contentEntries = slidesRef.current
        .map((s, index) => ({ s, index }))
        .filter(({ s }) => s.kind === 'content')

      // 已经决定过版式就不用再决定一次——比如从旧会话恢复、或者上一次已经成功决定过、只是后面选风格那步失败了
      if (contentEntries.length > 0 && !contentEntries[0].s.layout) {
        const decisions = await window.api.decideSlideLayouts(
          plan.task,
          contentEntries.map(({ s, index }) => ({
            index,
            title: s.title,
            keyPoints: s.keyPoints,
            sequential: !!s.sequential,
            // 哪几条要点自带真实素材图——让版式决策围绕这张图分配画面空间，而不是不知道图片存在
            keyPointsWithImage: s.requiredImages && s.requiredImages.length > 0
              ? s.requiredImages.map((img) => img.label)
              : undefined
          }))
        )
        const decisionMap = new Map(decisions.map((d) => [d.index, d]))
        slidesRef.current = slidesRef.current.map((s, i) => {
          const d = decisionMap.get(i)
          return d ? { ...s, layout: { composition: d.composition, intent: d.intent } } : s
        })
        setOutline(slidesRef.current)
      }

      await loadStyleOptions()
    } catch (err) {
      retryActionRef.current = confirmOutline
      setStatus('error')
      setError(err instanceof Error ? err.message : '决定版式失败，请稍后重试')
    }
  }

  const confirmStyleAndGenerateSample = () => {
    selectedStyleRef.current = selectedStyle
    styleModifiedRef.current = false
    generateSample()
  }

  const generateSample = async () => {
    setStatus('sample-generating')
    setError(null)
    try {
      const image = await generateOne(slidesRef.current[sampleIndexRef.current], sampleIndexRef.current)
      imagesRef.current.set(sampleIndexRef.current, image)
      setSampleImage(image)
      setSampleFeedback('')
      persistSession()
      setStatus('sample-review')
    } catch (err) {
      retryActionRef.current = generateSample
      setStatus('error')
      setError(err instanceof Error ? err.message : '生成样张失败，请稍后重试')
    }
  }

  // 对齐参考 skill 的做法（"revise the style description and regenerate"）：反馈不是临时拼进这一次的 prompt，
  // 而是先让 AI 把反馈真正改写进风格 JSON 本身，再拿改写后的风格重新生成样张——
  // 这样调整会延续到后面所有页，"保存风格"时存的也是这份改过的
  const reviseSampleWithFeedback = async (feedback: string) => {
    const current = selectedStyleRef.current
    if (!current) return
    // 先记下"重试就是重新提这次反馈"，风格改写成功后再改成"重试就是重新生成样张"——
    // 这样无论具体哪一步失败，error 页的重试都会精确地重做失败的那一步，不用靠 styleOptions/images
    // 这些无关状态去猜该走哪个分支（猜容易猜错，比如风格已经改好、只是样张图没生成出来这种情况）
    retryActionRef.current = () => reviseSampleWithFeedback(feedback)
    setStatus('sample-generating')
    setError(null)
    try {
      const revisedBrief = await window.api.reviseSlideStyle(plan.task, current.brief, feedback)
      // 提示词里已经要求模型不要改 style_name，但不能完全依赖模型听话——如果它顺手把这个内部字段也改了，
      // 会跟外层 SlideStyleOption.name（UI 显示、保存风格时用的名字）不一致，这里强制纠正回来兜底
      const correctedBrief = 'style_name' in revisedBrief ? { ...revisedBrief, style_name: current.name } : revisedBrief
      const revised = { ...current, brief: correctedBrief }
      selectedStyleRef.current = revised
      styleModifiedRef.current = true
      setSelectedStyle(revised)
      retryActionRef.current = generateSample
      await generateSample()
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : '按反馈调整风格失败，请稍后重试')
    }
  }

  const runBatch = async () => {
    const path = savePathRef.current
    if (!path) return
    setStatus('generating')
    setError(null)

    const slides = slidesRef.current

    try {
      // 对齐参考 skill 的做法（project-assembly-and-reporting.md 的 Speaker Notes 一节）：讲稿要能看到
      // 全篇大纲才写得好过渡句，这里一次性批量生成全篇；只在还没生成过时才生成，不随中断重试重新生成
      if (notesRef.current.size === 0) {
        const notes = await window.api.generateSlideNotes(
          plan.task,
          buildBackgroundText(plan),
          slides.map((s, index) => ({ index, kind: s.kind, title: s.title, keyPoints: s.keyPoints }))
        )
        for (const n of notes) notesRef.current.set(n.index, n.notes)
        persistSession()
      }

      // 样张只是用户目测批准的，从没经过自动化质检——skill 原文明确要求 "inspect every slide image"，
      // 样张批准后会原样留作最终这一页（"keep that file as the final slide for its page"），
      // 不能因为用户看过一眼就当它已经检查过了，这里补一次
      if (!qaResultsRef.current.has(sampleIndexRef.current)) {
        const sampleSpec = slides[sampleIndexRef.current]
        const sampleImageB64 = imagesRef.current.get(sampleIndexRef.current)
        if (sampleSpec && sampleImageB64) {
          // current 可能还留着上一次渲染的旧值（比如刚从 error 页重试进来）——这几秒钟里页面
          // 显示的是"正在生成第 X 页"，先把它对上正在质检的样张页，不留一段文案对不上进度的空档
          setCurrent(sampleIndexRef.current)
          const qa = await window.api.qaCheckSlideImage(sampleImageB64, [sampleSpec.title, ...sampleSpec.keyPoints], undefined, buildOutlineContextForQa(sampleSpec))
          setQaResult(sampleIndexRef.current, qa)
          persistSession()
        }
      }

      for (let i = 0; i < slides.length; i++) {
        if (imagesRef.current.has(i)) continue
        setCurrent(i)
        const image = await generateOne(slides[i], i)
        imagesRef.current.set(i, image)

        // 每生成一页就覆盖写一次 pptx 文件——中途失败/关闭，磁盘上也留着一份到目前为止能打开的 PPT
        const { images: orderedImgs, notes: orderedNotes } = orderedImagesAndNotes()
        const buffer = await buildPptxArrayBuffer(orderedImgs, orderedNotes)
        await window.api.writeBinaryFile(path, buffer)

        // 质检是"生成完顺手做"，不阻塞生成速度，失败/未配置都不影响主流程；
        // 带上样张图片做视觉参照，让质检模型能判断这一页跟整体风格是否一致，而不只是看这一页本身
        const referenceImage = i === sampleIndexRef.current ? undefined : imagesRef.current.get(sampleIndexRef.current)
        const qa = await window.api.qaCheckSlideImage(image, [slides[i].title, ...slides[i].keyPoints], referenceImage, buildOutlineContextForQa(slides[i]))
        setQaResult(i, qa)

        // 同时把这一页已经成功的事实落到会话记录里——跟上面写 pptx 文件是两件独立的持久化，
        // 前者是给用户看的成品，后者是给"下次打开能不能接着生成"用的进度状态
        persistSession()
      }

      await window.api.clearPptxExportSession(plan.id)
      setStatus('done')
    } catch (err) {
      retryActionRef.current = runBatch
      setStatus('error')
      setError(err instanceof Error ? err.message : '生成 PPT 失败，请稍后重试')
    }
  }

  const regeneratePage = async (index: number) => {
    const path = savePathRef.current
    if (!path) return
    setRegeneratedIndices((prev) => new Set(prev).add(index))
    // 样张是全篇风格的参照锚点——如果这次重新生成的正好是样张，而且已经有其它页拿旧样张生成好了，
    // 这些页不会跟着更新，风格可能就不统一了；照实记一下，稍后在完成页提示用户
    if (index === sampleIndexRef.current && imagesRef.current.size > 1) {
      setSampleRegeneratedAfterOthers(true)
    }
    setStatus('generating')
    setError(null)
    setCurrent(index)
    try {
      // 对齐参考 skill 的做法（project-assembly-and-reporting.md："regenerate it with a more constrained
      // prompt"）：把质检指出的具体问题当成约束条件带进重新生成的 prompt，而不是什么都不告诉模型、
      // 指望它换一次运气就能对
      const qaNote = qaResultsRef.current.get(index)?.note
      const feedback = qaNote ? `质检发现这一页有问题：${qaNote}。请修正这个问题，其余要求不变。` : undefined
      const image = await generateOne(slidesRef.current[index], index, feedback)
      imagesRef.current.set(index, image)
      const { images: orderedImgs, notes: orderedNotes } = orderedImagesAndNotes()
      const buffer = await buildPptxArrayBuffer(orderedImgs, orderedNotes)
      await window.api.writeBinaryFile(path, buffer)
      const referenceImage = index === sampleIndexRef.current ? undefined : imagesRef.current.get(sampleIndexRef.current)
      const qa = await window.api.qaCheckSlideImage(image, [slidesRef.current[index].title, ...slidesRef.current[index].keyPoints], referenceImage, buildOutlineContextForQa(slidesRef.current[index]))
      setQaResult(index, qa)
      persistSession()
      setStatus('done')
    } catch (err) {
      retryActionRef.current = () => regeneratePage(index)
      setStatus('error')
      setError(err instanceof Error ? err.message : '重新生成失败，请稍后重试')
    }
  }

  // 用户选择"继续生成"：从会话记录里恢复所有内存状态，再按进度落点决定跳到哪一步
  const resumeSession = (session: PptxExportSession) => {
    savePathRef.current = session.savePath
    setSavePath(session.savePath)
    slidesRef.current = session.outline
    setOutline(session.outline)
    setTotal(session.outline.length)
    sampleIndexRef.current = session.sampleIndex
    selectedStyleRef.current = session.selectedStyle
    styleModifiedRef.current = session.styleModified
    setSelectedStyle(session.selectedStyle)
    imagesRef.current = new Map(session.images)
    qaResultsRef.current = new Map(session.qaResults)
    setQaResults(new Map(session.qaResults))
    notesRef.current = new Map(session.notes ?? [])

    if (imagesRef.current.size >= session.outline.length) {
      // 所有页早就生成完了，pptx 文件本身也已经是完整的，只是上次没来得及清掉会话记录或显示"完成"页
      window.api.clearPptxExportSession(plan.id)
      setStatus('done')
    } else if (imagesRef.current.size === 1 && imagesRef.current.has(session.sampleIndex)) {
      // 只有样张，还没进入批量生成——回到样张确认页，让用户重新确认或直接继续
      setSampleImage(imagesRef.current.get(session.sampleIndex) ?? null)
      setStatus('sample-review')
    } else {
      // 批量生成已经开始，直接接着生成剩下的页
      runBatch()
    }
  }

  const handleSaveStyle = async () => {
    const style = selectedStyleRef.current
    const name = saveStyleName.trim()
    if (!style || !name) return
    if (savedStyles.some((s) => s.name === name)) {
      // 已经存在同名风格，先让用户确认要不要覆盖，不直接静默覆盖
      setPendingOverwriteName(name)
      return
    }
    const styles = await window.api.saveSlideStyle({ name, description: style.description, brief: style.brief, savedAt: Date.now() })
    setSavedStyles(styles)
    setStyleSaved(true)
  }

  const confirmOverwriteStyle = async () => {
    const style = selectedStyleRef.current
    const name = pendingOverwriteName
    if (!style || !name) return
    const styles = await window.api.saveSlideStyle({ name, description: style.description, brief: style.brief, savedAt: Date.now() })
    setSavedStyles(styles)
    setPendingOverwriteName(null)
    setStyleSaved(true)
  }

  const failedPages = Array.from(qaResults.entries()).filter(([, qa]) => !qa.ok)

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800">生成 PPT</h2>
          <button onClick={onClose} className="text-neutral-400 transition hover:text-neutral-700">
            <X size={16} />
          </button>
        </div>

        {status === 'checking-session' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={24} className="animate-spin text-neutral-400" />
          </div>
        )}

        {status === 'resume-prompt' && resumableSession && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle size={24} className="text-amber-500" />
            <p className="text-center text-sm text-neutral-600">
              检测到上次有一份未完成的 PPT，已经生成了 {resumableSession.images.length} / {resumableSession.outline.length} 页
            </p>
            <p className="break-all text-center text-xs text-neutral-400">{resumableSession.savePath}</p>
            <div className="flex gap-2">
              <button
                onClick={async () => {
                  await window.api.clearPptxExportSession(plan.id)
                  setResumableSession(null)
                  await startFresh()
                }}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                重新开始
              </button>
              <button
                onClick={() => resumeSession(resumableSession)}
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                继续生成
              </button>
            </div>
          </div>
        )}

        {status === 'choosing-path' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={24} className="animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-600">请选择保存位置...</p>
          </div>
        )}

        {status === 'outline-review' && (
          <div className="flex flex-col gap-3">
            {staleSessionDiscarded && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
                检测到树的内容在上次生成后被改过，之前没生成完的进度已经作废，需要重新生成
              </p>
            )}
            <p className="text-sm text-neutral-600">共 {outline.length} 页，确认大纲后先生成 1 张样张</p>
            {/* 对齐参考 skill 的做法（outline-style-and-sample.md）：如果大纲里有页面带了必须使用的
                素材图，要在生成前明确展示图和页面的对应关系，让用户确认没有配错 */}
            {outline.some((spec) => spec.requiredImages && spec.requiredImages.length > 0) && (
              <p className="rounded-lg bg-blue-50 px-3 py-2 text-xs text-blue-700">
                请确认下面每张图对应的页面正确，生成时这些图会原样用在对应页面里
              </p>
            )}
            <p className="text-xs text-neutral-400">拖动要点到别的卡片可以合并；拖到两张卡片中间的空白处可以拆成单独一页；只能在同一节内拖动</p>
            <div className="max-h-96 overflow-y-auto rounded-xl border border-neutral-100 p-3">
              {groupOutlineForReview(outline).map((block, blockIndex) => {
                if (block.kind === 'simple') {
                  return (
                    <div key={blockIndex} className="border-b border-neutral-50 py-2 text-xs last:border-0">
                      <p className="font-medium text-neutral-700">
                        {block.spec.sectionNumber ? `${block.spec.sectionNumber} · ` : ''}{block.spec.title}
                      </p>
                      {block.spec.keyPoints.length > 0 && (
                        <p className="mt-0.5 text-neutral-400">{block.spec.keyPoints.join('、')}</p>
                      )}
                    </div>
                  )
                }

                const branchId = block.sectionSpec.branchNodeId
                // 正在拖的要点跟这一节是同一节吗——是的话，这一节所有缝隙都要提示"可以拆页"，
                // 不是只有鼠标正好压过去的那一条才有反应
                const gapsVisible = !!draggingKeyPoint && draggingKeyPoint.branchNodeId === branchId
                return (
                  <div key={blockIndex} className="border-b border-neutral-50 py-2 text-xs last:border-0">
                    <p className="font-medium text-neutral-700">
                      {block.sectionSpec.sectionNumber ? `${block.sectionSpec.sectionNumber} · ` : ''}{block.sectionSpec.title}
                    </p>
                    <div className="mt-1.5 flex flex-col gap-1">
                      {branchId && (
                        <DropGap
                          dragging={gapsVisible}
                          active={dragOverTarget === `gap-${branchId}-start`}
                          onDragOver={handleDragOverTarget(`gap-${branchId}-start`, branchId)}
                          onDragLeave={handleDragLeaveTarget(`gap-${branchId}-start`)}
                          onDrop={handleDropBetweenCards(branchId, null)}
                        />
                      )}
                      {block.cards.map((card, cardIndex) => (
                        <Fragment key={card.index}>
                          <div className="rounded-lg border border-neutral-100 bg-neutral-50/60 p-2">
                            <div className="flex flex-wrap gap-1.5">
                              {card.spec.keyPoints.map((point, pointIndex) => {
                                const nodeId = card.spec.keyPointNodeIds?.[pointIndex]
                                if (!nodeId || !branchId) {
                                  return <span key={pointIndex} className="rounded-md bg-white px-2 py-1 text-neutral-600">{point}</span>
                                }
                                const targetKey = `after-${nodeId}`
                                // 拖动过程中，除了正在拖的那一条本身以外，其它每一条都要提示"松手会合并到这里"，
                                // 不能只在鼠标正好悬停时才有反应——否则用户不知道"拖到要点上面"这个动作本身有意义
                                const isDropCandidate = gapsVisible && draggingKeyPoint?.nodeId !== nodeId
                                return (
                                  <div
                                    key={pointIndex}
                                    draggable
                                    onDragStart={handleKeyPointDragStart(branchId, nodeId)}
                                    onDragEnd={handleKeyPointDragEnd}
                                    onDragOver={handleDragOverTarget(targetKey, branchId)}
                                    onDragLeave={handleDragLeaveTarget(targetKey)}
                                    onDrop={handleDropAfterKeyPoint(branchId, nodeId)}
                                    className={`flex cursor-grab items-center gap-1 rounded-md border px-2 py-1 text-neutral-600 transition active:cursor-grabbing ${
                                      dragOverTarget === targetKey
                                        ? 'border-blue-400 bg-blue-100'
                                        : isDropCandidate
                                          ? 'border-dashed border-blue-200 bg-blue-50/40'
                                          : 'border-transparent bg-white'
                                    } ${draggingKeyPoint?.nodeId === nodeId ? 'opacity-40' : ''}`}
                                  >
                                    <GripVertical size={11} className="text-neutral-300" />
                                    {point}
                                  </div>
                                )
                              })}
                            </div>
                            {card.spec.requiredImages && card.spec.requiredImages.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-2">
                                {card.spec.requiredImages.map((img, imgIndex) => (
                                  <div key={imgIndex} className="flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50/60 px-1.5 py-1">
                                    <img src={img.imageDataUrl} alt={img.label} className="h-8 w-8 rounded object-cover" />
                                    <span className="text-blue-700">{img.label}{img.caption ? ` · ${img.caption}` : ''}</span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          {branchId && (
                            <DropGap
                              dragging={gapsVisible}
                              active={dragOverTarget === `gap-${branchId}-${cardIndex}`}
                              onDragOver={handleDragOverTarget(`gap-${branchId}-${cardIndex}`, branchId)}
                              onDragLeave={handleDragLeaveTarget(`gap-${branchId}-${cardIndex}`)}
                              onDrop={handleDropBetweenCards(branchId, card.spec.keyPointNodeIds?.[card.spec.keyPointNodeIds.length - 1] ?? null)}
                            />
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-neutral-200 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={confirmOutline}
                className="flex-1 rounded-full bg-neutral-900 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                大纲没问题，下一步选风格
              </button>
            </div>
          </div>
        )}

        {status === 'style-loading' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <Loader2 size={24} className="animate-spin text-neutral-400" />
            <p className="text-sm text-neutral-600">正在决定版式、生成风格方案...</p>
          </div>
        )}

        {status === 'style-selecting' && (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-neutral-600">选一个视觉风格方案，用来生成样张（后面所有页都会保持同一个风格）</p>
            {savedStyles.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <p className="text-xs font-medium text-neutral-500">个人风格库</p>
                <div className="flex max-h-40 flex-col gap-2 overflow-y-auto">
                  {savedStyles.map((style) => (
                    <div
                      key={style.name}
                      className={`flex items-start gap-2 rounded-xl border p-3 text-xs transition ${
                        selectedStyle?.name === style.name
                          ? 'border-neutral-900 bg-neutral-50'
                          : 'border-neutral-200 hover:bg-neutral-50'
                      }`}
                    >
                      <button
                        onClick={() => setSelectedStyle({ name: style.name, description: style.description, recommended: false, brief: style.brief })}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="mb-1 font-medium text-neutral-800">{style.name}</p>
                        <p className="text-neutral-500">{style.description}</p>
                      </button>
                      <button
                        onClick={async () => {
                          const styles = await window.api.deleteSlideStyle(style.name)
                          setSavedStyles(styles)
                          if (selectedStyle?.name === style.name) setSelectedStyle(null)
                        }}
                        title="删除这份风格"
                        className="shrink-0 text-neutral-300 transition hover:text-red-500"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              {savedStyles.length > 0 && <p className="text-xs font-medium text-neutral-500">AI 提议的新方案</p>}
              <div className="flex max-h-80 flex-col gap-2 overflow-y-auto">
                {styleOptions.map((option) => (
                  <button
                    key={option.name}
                    onClick={() => setSelectedStyle(option)}
                    className={`rounded-xl border p-3 text-left text-xs transition ${
                      selectedStyle?.name === option.name
                        ? 'border-neutral-900 bg-neutral-50'
                        : 'border-neutral-200 hover:bg-neutral-50'
                    }`}
                  >
                    <p className="mb-1 flex items-center gap-1.5 font-medium text-neutral-800">
                      {option.name}
                      {option.recommended && (
                        <span className="rounded-full bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">推荐</span>
                      )}
                    </p>
                    <p className="text-neutral-500">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="flex-1 rounded-full border border-neutral-200 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={confirmStyleAndGenerateSample}
                disabled={!selectedStyle}
                className="flex-1 rounded-full bg-neutral-900 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                用这个风格生成样张
              </button>
            </div>
          </div>
        )}

        {(status === 'sample-generating' || status === 'generating') && (
          <div className="flex flex-col items-center gap-3 py-6">
            {previewImage ? (
              <img
                src={`data:image/png;base64,${previewImage}`}
                alt="生成中的预览图"
                className="w-full rounded-lg border border-neutral-100 object-cover"
              />
            ) : (
              <Loader2 size={24} className="animate-spin text-neutral-400" />
            )}
            <p className="text-sm text-neutral-600">
              {status === 'sample-generating'
                ? `正在生成样张...（已等待 ${elapsed} 秒）`
                : notesRef.current.size === 0
                  ? '正在生成全篇演讲备注...'
                  : `正在生成第 ${current + 1} / ${total} 页...（已等待 ${elapsed} 秒）`}
            </p>
            {!previewImage && elapsed >= 30 && (
              <p className="text-center text-xs text-amber-500">
                还没收到预览图，可能是这个服务商不支持实时进度、正在用普通方式生成，请再等一下
              </p>
            )}
            {savePath && <p className="text-center text-xs text-neutral-400">将保存到：{savePath}</p>}
          </div>
        )}

        {status === 'sample-review' && sampleImage && (
          <div className="flex flex-col gap-3">
            <img
              src={`data:image/png;base64,${sampleImage}`}
              alt="样张"
              className="w-full rounded-lg border border-neutral-100 object-cover"
            />
            <div className="flex gap-2">
              <textarea
                value={sampleFeedback}
                onChange={(e) => setSampleFeedback(e.target.value)}
                placeholder="不满意？说说想怎么改（比如换个风格、字号大一点）"
                rows={1}
                className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
              <button
                onClick={() => sampleFeedback.trim() && reviseSampleWithFeedback(sampleFeedback.trim())}
                disabled={!sampleFeedback.trim()}
                className="shrink-0 rounded-xl bg-neutral-900 p-2.5 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Send size={15} />
              </button>
            </div>
            <button
              onClick={runBatch}
              className="rounded-full bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              样张满意，生成剩下 {total - 1} 页
            </button>
          </div>
        )}

        {status === 'done' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <p className="text-sm text-neutral-600">PPT 已生成并保存到：</p>
            <p className="break-all text-center text-xs text-neutral-400">{savePath}</p>
            {notesRef.current.size > 0 && (
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 size={13} /> 已为每一页写好演讲备注，打开 PPT 的"备注"视图就能看到
              </p>
            )}
            {sampleRegeneratedAfterOthers && (
              <p className="w-full rounded-lg bg-amber-50 px-3 py-2 text-center text-xs text-amber-700">
                样张页在其它页生成完之后被重新生成过，其它页仍然是照旧样张的风格画的，可能跟新样张不完全统一，建议看一下
              </p>
            )}
            {failedPages.length > 0 ? (
              <div className="w-full rounded-xl bg-amber-50 p-3">
                <p className="mb-1.5 text-xs font-medium text-amber-700">
                  质检提示以下几页可能有问题（仅供参考，不代表一定有误）：
                </p>
                {failedPages.map(([index, qa]) => (
                  <div key={index} className="mb-1.5 flex items-center justify-between gap-2 text-xs last:mb-0">
                    <span className="text-amber-700">第 {index + 1} 页：{qa.note}</span>
                    <button
                      onClick={() => regeneratePage(index)}
                      className="shrink-0 rounded-full border border-amber-300 px-2 py-0.5 text-amber-700 transition hover:bg-amber-100"
                    >
                      重新生成
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 size={13} /> 质检未发现明显问题
              </p>
            )}
            {regeneratedIndices.size > 0 && (
              <p className="w-full text-center text-xs text-neutral-400">
                第 {Array.from(regeneratedIndices).sort((a, b) => a - b).map((i) => i + 1).join('、')} 页被重新生成过
              </p>
            )}
            {selectedStyleRef.current && styleModifiedRef.current && !styleSaved && (
              <div className="w-full rounded-xl bg-neutral-50 p-3">
                {pendingOverwriteName ? (
                  <>
                    <p className="mb-1.5 text-xs text-amber-700">已经存在同名风格「{pendingOverwriteName}」，要覆盖吗？</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setPendingOverwriteName(null)}
                        className="flex-1 rounded-lg border border-neutral-200 py-1.5 text-xs font-medium text-neutral-600 transition hover:bg-neutral-100"
                      >
                        改个名字
                      </button>
                      <button
                        onClick={confirmOverwriteStyle}
                        className="flex-1 rounded-lg bg-neutral-900 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700"
                      >
                        覆盖
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-1.5 text-xs text-neutral-500">这份风格经过你的调整，存起来下次可以直接选它</p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={saveStyleName}
                        onChange={(e) => setSaveStyleName(e.target.value)}
                        placeholder={selectedStyleRef.current.name}
                        className="flex-1 rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs text-neutral-800 outline-none focus:border-neutral-400"
                      />
                      <button
                        onClick={handleSaveStyle}
                        disabled={!saveStyleName.trim()}
                        className="shrink-0 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        保存风格
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {styleSaved && (
              <p className="flex items-center gap-1 text-xs text-emerald-600">
                <CheckCircle2 size={13} /> 风格已保存，下次可以直接选用
              </p>
            )}
            <button
              onClick={onClose}
              className="rounded-full bg-emerald-600 px-6 py-2 text-sm font-medium text-white transition hover:bg-emerald-500"
            >
              关闭
            </button>
          </div>
        )}

        {status === 'error' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <AlertCircle size={24} className="text-red-500" />
            <p className="text-center text-sm text-neutral-600">{error}</p>
            <p className="text-xs text-neutral-400">前面已生成的页已经写入磁盘，重试会接着从中断的地方继续，不重新生成</p>
            <div className="flex gap-2">
              <button
                onClick={onClose}
                className="rounded-full border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
              >
                取消
              </button>
              <button
                onClick={() => retryActionRef.current?.()}
                className="rounded-full bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
              >
                重试
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}
