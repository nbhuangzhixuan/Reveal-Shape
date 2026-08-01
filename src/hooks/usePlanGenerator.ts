import { useCallback, useEffect, useMemo, useState } from 'react'
import type { AnsweredQuestion, FiveWTwoHKey, Plan, Restructure, RestructureDraft, TreeNode, Understanding, UnderstandingQuestion } from '@shared/index'

function updateNodeById(root: TreeNode, id: string, updater: (n: TreeNode) => TreeNode): TreeNode {
  if (root.id === id) return updater(root)
  return { ...root, children: root.children.map((c) => updateNodeById(c, id, updater)) }
}

// 呈现阶段允许直接删掉某个节点（连同它的子树）——用来把计划里没做/不需要的部分去掉，
// 不需要走 AI 重新生成；根节点不会出现在这里，调用方需要在此之前挡掉"删根节点"这种请求
function removeNodeById(root: TreeNode, id: string): TreeNode {
  return { ...root, children: root.children.filter((c) => c.id !== id).map((c) => removeNodeById(c, id)) }
}

function buildPath(root: TreeNode, id: string): TreeNode[] | null {
  if (root.id === id) return [root]
  for (const c of root.children) {
    const sub = buildPath(c, id)
    if (sub) return [root, ...sub]
  }
  return null
}

// 当前"前沿"：已经生成出来、还没往下展开、且不是叶子的节点——按层确认展开的对象
function collectFrontier(node: TreeNode): string[] {
  if (node.isLeaf) return []
  if (node.children.length === 0) return [node.id]
  return node.children.flatMap(collectFrontier)
}

export function usePlanGenerator() {
  const [plans, setPlans] = useState<Plan[]>([])
  const [activePlanId, setActivePlanId] = useState<string | null>(null)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isRestored, setIsRestored] = useState(false)
  // 最近一次生成/重新生成出来的一批节点 id——支持"这一层不对，重新生成"
  const [lastExpandedIds, setLastExpandedIds] = useState<string[]>([])
  // 树编辑历史：整棵树的编辑操作（AI 改写、手动编辑、删除、新增、移动）在应用前都会把当前 root
  // 压进 undo 栈，支持撤销/重做。只有 root 已存在时的编辑才会记录（建根本身不记录）
  const [undoStack, setUndoStack] = useState<TreeNode[]>([])
  const [redoStack, setRedoStack] = useState<TreeNode[]>([])

  const plan = useMemo(() => plans.find((p) => p.id === activePlanId) ?? null, [plans, activePlanId])

  // 切换计划后，上一份计划的"最近展开层"跟这份计划无关，清空
  useEffect(() => {
    setLastExpandedIds([])
  }, [activePlanId])

  // 启动时恢复上次保存的计划列表；读取失败（plan.json 损坏等）也不能让恢复永远卡住，
  // 否则侧边栏一直是空、保存也停摆——历史记录看起来就"丢了"。失败就当没有历史，能正常用即可
  useEffect(() => {
    window.api.getPlanState()
      .then((state) => {
        setPlans(state.plans)
        setActivePlanId(state.activePlanId)
      })
      .catch((err) => {
        console.error('[plan-restore] 恢复计划列表失败，按空历史启动', err)
      })
      .finally(() => setIsRestored(true))
  }, [])

  // 计划列表变化时自动保存
  useEffect(() => {
    if (!isRestored) return
    window.api.savePlanState(plans, activePlanId)
  }, [plans, activePlanId, isRestored])

  const updatePlan = useCallback((id: string, updater: (p: Plan) => Plan) => {
    setPlans((cur) => cur.map((p) => (p.id === id ? { ...updater(p), updatedAt: Date.now() } : p)))
  }, [])

  // 树编辑前的快照：把当前 root 压进撤销栈，清空重做栈。只在 root 已存在时记录——首次建根本身
  // 不记录（还没有可撤的"上一步"），后续所有编辑（AI 改写、手动编辑、删除、新增、移动）都走这里
  const pushHistory = useCallback(() => {
    const root = plan?.root
    if (!root) return
    setUndoStack((s) => [...s, root])
    setRedoStack([])
  }, [plan?.root])

  // 撤销：把当前 root 压进重做栈，从撤销栈弹出一份当作新的 root。每次最多撤一步，
  // 无历史可撤时静默返回（按钮的 disabled 已挡住 UI 入口）
  const undo = useCallback(() => {
    const root = plan?.root
    if (!root || undoStack.length === 0) return
    const previous = undoStack[undoStack.length - 1]
    setUndoStack((s) => s.slice(0, -1))
    setRedoStack((s) => [...s, root])
    updatePlan(plan.id, (p) => ({ ...p, root: previous }))
  }, [plan?.root, plan?.id, undoStack, updatePlan])

  // 重做：撤销的镜像——把当前 root 压回撤销栈，从重做栈弹出一份
  const redo = useCallback(() => {
    const root = plan?.root
    if (!root || redoStack.length === 0) return
    const next = redoStack[redoStack.length - 1]
    setRedoStack((s) => s.slice(0, -1))
    setUndoStack((s) => [...s, root])
    updatePlan(plan.id, (p) => ({ ...p, root: next }))
  }, [plan?.root, plan?.id, redoStack, updatePlan])

  // 输入一句话，立刻建一条计划记录，进入理解阶段
  const startUnderstanding = useCallback(async (task: string, referenceText?: string) => {
    const now = Date.now()
    const understanding: Understanding = { status: 'selecting', questions: [], currentIndex: 0, draft: null, summary: null, confirmed: false }
    const newPlan: Plan = {
      id: crypto.randomUUID(),
      task,
      root: null,
      phase: 'understand',
      understanding,
      referenceText,
      createdAt: now,
      updatedAt: now
    }
    setPlans((cur) => [...cur, newPlan])
    setActivePlanId(newPlan.id)
    setIsGenerating(true)
    setError(null)
    try {
      const questionDrafts = await window.api.selectUnderstandingQuestions(task, referenceText)
      if (questionDrafts.length === 0) {
        const { draft, summary } = await window.api.synthesizeUnderstanding(task, [], referenceText)
        updatePlan(newPlan.id, (p) => ({ ...p, understanding: { ...p.understanding!, status: 'reviewing', draft, summary } }))
      } else {
        const questions: UnderstandingQuestion[] = questionDrafts.map((q) => ({ ...q, answer: null, skipped: false }))
        updatePlan(newPlan.id, (p) => ({ ...p, understanding: { ...p.understanding!, status: 'asking', questions } }))
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '理解这件事失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }, [updatePlan])

  // 回答（或跳过，answer 传 null）当前一题；答完最后一题触发综合
  const answerCurrentQuestion = useCallback(async (answer: string | null) => {
    if (!plan?.understanding) return
    const planId = plan.id
    const task = plan.task
    const { questions, currentIndex } = plan.understanding
    const updatedQuestions = questions.map((q, i) =>
      i === currentIndex ? { ...q, answer, skipped: answer === null } : q
    )
    const nextIndex = currentIndex + 1

    if (nextIndex < questions.length) {
      updatePlan(planId, (p) => ({ ...p, understanding: { ...p.understanding!, questions: updatedQuestions, currentIndex: nextIndex } }))
      return
    }

    updatePlan(planId, (p) => ({ ...p, understanding: { ...p.understanding!, questions: updatedQuestions, currentIndex: nextIndex, status: 'synthesizing' } }))
    setIsGenerating(true)
    setError(null)
    try {
      const answered: AnsweredQuestion[] = updatedQuestions.map((q) => ({
        key: q.key,
        question: q.question,
        answer: q.skipped ? null : q.answer
      }))
      const { draft, summary } = await window.api.synthesizeUnderstanding(task, answered, plan.referenceText)
      updatePlan(planId, (p) => ({ ...p, understanding: { ...p.understanding!, status: 'reviewing', draft, summary } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '综合 5W2H 失败，请稍后重试')
      updatePlan(planId, (p) => ({ ...p, understanding: { ...p.understanding!, status: 'asking' } }))
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan])

  // 审核阶段：直接编辑某一项文字
  const editUnderstandingField = useCallback((key: FiveWTwoHKey, value: string) => {
    if (!plan?.understanding?.draft) return
    updatePlan(plan.id, (p) => ({
      ...p,
      understanding: { ...p.understanding!, draft: { ...p.understanding!.draft!, [key]: { value, source: 'user' } } }
    }))
  }, [plan, updatePlan])

  // 审核阶段：整体反馈，让 AI 重新生成整份草稿（含整体描述）
  const refineUnderstandingDraft = useCallback(async (feedback: string) => {
    if (!plan?.understanding?.draft || !plan.understanding.summary) return
    setIsGenerating(true)
    setError(null)
    try {
      const { draft, summary } = await window.api.refineUnderstanding(
        plan.task,
        { draft: plan.understanding.draft, summary: plan.understanding.summary },
        feedback
      )
      updatePlan(plan.id, (p) => ({ ...p, understanding: { ...p.understanding!, draft, summary } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改 5W2H 失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan])

  // 确认 5W2H，触发 AB+SCQA+SAP 推导。推导结果（受众/期望行为/序言故事/主题）本质还是"把这件事
  // 理解清楚"的延伸，所以阶段保持在"理解"——用户确认主题后才进入"重构"阶段展开成树
  const confirmUnderstanding = useCallback(async () => {
    if (!plan?.understanding?.draft) return
    const planId = plan.id
    const task = plan.task
    const fiveWTwoH = plan.understanding.draft
    const restructure: Restructure = { draft: null, confirmed: false }
    updatePlan(planId, (p) => ({
      ...p,
      understanding: { ...p.understanding!, confirmed: true },
      restructure
    }))
    setIsGenerating(true)
    setError(null)
    try {
      const draft = await window.api.deriveRestructure(task, fiveWTwoH)
      updatePlan(planId, (p) => ({ ...p, restructure: { ...p.restructure!, draft } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '梳理表达逻辑失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan])

  // 重构审核阶段：直接编辑某一项文字
  const editRestructureField = useCallback((key: keyof RestructureDraft, value: string) => {
    if (!plan?.restructure?.draft) return
    updatePlan(plan.id, (p) => ({
      ...p,
      restructure: { ...p.restructure!, draft: { ...p.restructure!.draft!, [key]: value } }
    }))
  }, [plan, updatePlan])

  // 重构审核阶段：整体反馈，让 AI 重新生成整份草稿
  const refineRestructureDraft = useCallback(async (feedback: string) => {
    if (!plan?.restructure?.draft) return
    setIsGenerating(true)
    setError(null)
    try {
      const draft = await window.api.refineRestructure(plan.task, plan.restructure.draft, feedback)
      updatePlan(plan.id, (p) => ({ ...p, restructure: { ...p.restructure!, draft } }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '修改失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan])

  // 确认主题，进入重构阶段：创建根节点，立刻为它生成第一层；等用户确认整棵树再进呈现
  const confirmRestructure = useCallback(async () => {
    if (!plan?.restructure?.draft || !plan.understanding?.draft) return
    const planId = plan.id
    const task = plan.task
    const understanding = plan.understanding.draft
    const restructure = plan.restructure.draft
    const rootNode: TreeNode = {
      id: crypto.randomUUID(),
      title: restructure.theme,
      description: undefined,
      children: [],
      isLeaf: false,
      confirmed: true,
      isLoading: true
    }
    updatePlan(planId, (p) => ({
      ...p,
      phase: 'restructure',
      root: rootNode,
      restructure: { ...p.restructure!, confirmed: true }
    }))
    setIsGenerating(true)
    setError(null)
    try {
      const { children, sequential } = await window.api.generateChildren(task, understanding, restructure, [{ title: restructure.theme }])
      updatePlan(planId, (p) => ({ ...p, root: { ...p.root!, children, childrenSequential: sequential, isLoading: false } }))
      setLastExpandedIds([rootNode.id])
    } catch (err) {
      setError(err instanceof Error ? err.message : '生成结构失败，请稍后重试')
      updatePlan(planId, (p) => ({ ...p, root: { ...p.root!, isLoading: false } }))
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan])

  // 树搭得差不多了，进入呈现阶段（只读浏览）
  const confirmTree = useCallback(() => {
    if (!plan?.root) return
    setLastExpandedIds([])
    updatePlan(plan.id, (p) => ({ ...p, phase: 'present' }))
  }, [plan, updatePlan])

  // 前沿节点数量——还有多少个"已生成但还没往下展开"的非叶子节点
  const frontierCount = useMemo(() => (plan?.root ? collectFrontier(plan.root).length : 0), [plan?.root])

  // 按层确认：把当前前沿所有节点一起标记确认，并行为它们生成下一层
  const confirmFrontier = useCallback(async () => {
    if (!plan?.root || !plan.understanding?.draft || !plan.restructure?.draft) return
    const planId = plan.id
    const task = plan.task
    const understanding = plan.understanding.draft
    const restructure = plan.restructure.draft
    const originalRoot = plan.root
    const frontierIds = collectFrontier(originalRoot)
    if (frontierIds.length === 0) return

    pushHistory()
    updatePlan(planId, (p) => {
      let root = p.root!
      for (const id of frontierIds) {
        root = updateNodeById(root, id, (n) => ({ ...n, confirmed: true, isLoading: true }))
      }
      return { ...p, root }
    })
    setIsGenerating(true)
    setError(null)
    try {
      await Promise.all(frontierIds.map(async (id) => {
        const path = buildPath(originalRoot, id)
        if (!path) return
        const pathForApi = path.map((n) => ({ title: n.title, description: n.description }))
        const { children, sequential } = await window.api.generateChildren(task, understanding, restructure, pathForApi)
        updatePlan(planId, (p) => ({ ...p, root: updateNodeById(p.root!, id, (n) => ({ ...n, children, childrenSequential: sequential, isLoading: false })) }))
      }))
      setLastExpandedIds(frontierIds)
    } catch (err) {
      setError(err instanceof Error ? err.message : '展开下一层失败，请稍后重试')
      updatePlan(planId, (p) => {
        let root = p.root!
        for (const id of frontierIds) {
          root = updateNodeById(root, id, (n) => ({ ...n, isLoading: false }))
        }
        return { ...p, root }
      })
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan])

  // 刚展开的这一层不满意：带着反馈，对同一批父节点重新生成子节点
  const refineFrontier = useCallback(async (feedback: string) => {
    if (!plan?.root || !plan.understanding?.draft || !plan.restructure?.draft) return
    if (lastExpandedIds.length === 0) return
    const planId = plan.id
    const task = plan.task
    const understanding = plan.understanding.draft
    const restructure = plan.restructure.draft
    const originalRoot = plan.root
    const ids = lastExpandedIds

    pushHistory()
    updatePlan(planId, (p) => {
      let root = p.root!
      for (const id of ids) {
        root = updateNodeById(root, id, (n) => ({ ...n, isLoading: true }))
      }
      return { ...p, root }
    })
    setIsGenerating(true)
    setError(null)
    try {
      await Promise.all(ids.map(async (id) => {
        const path = buildPath(originalRoot, id)
        if (!path) return
        const pathForApi = path.map((n) => ({ title: n.title, description: n.description }))
        const { children, sequential } = await window.api.generateChildren(task, understanding, restructure, pathForApi, feedback)
        updatePlan(planId, (p) => ({ ...p, root: updateNodeById(p.root!, id, (n) => ({ ...n, children, childrenSequential: sequential, isLoading: false })) }))
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '重新生成这一层失败，请稍后重试')
      updatePlan(planId, (p) => {
        let root = p.root!
        for (const id of ids) {
          root = updateNodeById(root, id, (n) => ({ ...n, isLoading: false }))
        }
        return { ...p, root }
      })
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan, lastExpandedIds])

  // 让 AI 改写选中的若干节点自己的标题/描述（"改哪些节点只动哪些节点"）：上下文把每个目标节点
  // 的路径 + 兄弟节点都给 AI 看懂，但输出作用域被锁死在目标节点的 title/description 两个字段上。
  // children/confirmed/isLoading 等字段一律不动，保证不会连带改到别的节点。多选改写算一次用户操作，
  // 只压一次历史快照，undo 一步撤回整个多选改写
  const rewriteNode = useCallback(async (nodeIds: string[], feedback: string) => {
    if (!plan?.root || !plan.understanding?.draft || !plan.restructure?.draft) return
    if (nodeIds.length === 0) return
    const planId = plan.id
    const task = plan.task
    const understanding = plan.understanding.draft
    const restructure = plan.restructure.draft
    const root = plan.root

    pushHistory()
    setIsGenerating(true)
    setError(null)
    try {
      await Promise.all(nodeIds.map(async (nodeId) => {
        const path = buildPath(root, nodeId)
        if (!path) return
        // 找目标节点的兄弟节点（同父的 title/description，不含自己）——增强 AI 改写的贴合语境
        const parent = path[path.length - 2]
        const siblings = parent ? parent.children.filter((c) => c.id !== nodeId).map((c) => ({ title: c.title, description: c.description })) : []
        const pathForApi = path.map((n) => ({ title: n.title, description: n.description }))
        const patch = await window.api.rewriteNode(task, understanding, restructure, pathForApi, siblings, feedback)
        updatePlan(planId, (p) => ({ ...p, root: updateNodeById(p.root!, nodeId, (n) => ({ ...n, title: patch.title, description: patch.description ?? n.description })) }))
      }))
    } catch (err) {
      setError(err instanceof Error ? err.message : '改写节点失败，请稍后重试')
    } finally {
      setIsGenerating(false)
    }
  }, [plan, updatePlan, pushHistory])

  // 直接编辑某节点的标题/描述
  const editNode = useCallback((nodeId: string, patch: Partial<Pick<TreeNode, 'title' | 'description' | 'imageCaption'>>) => {
    if (!plan?.root) return
    pushHistory()
    updatePlan(plan.id, (p) => ({ ...p, root: updateNodeById(p.root!, nodeId, (n) => ({ ...n, ...patch })) }))
  }, [plan, updatePlan, pushHistory])

  // 呈现阶段：删掉某个节点（连同它的子树）——比如计划里有些事实际没做，不需要留在最终呈现里
  const deleteNode = useCallback((nodeId: string) => {
    if (!plan?.root) return
    if (plan.root.id === nodeId) return // 根节点是整件事本身，不允许删
    pushHistory()
    updatePlan(plan.id, (p) => ({ ...p, root: removeNodeById(p.root!, nodeId) }))
  }, [plan, updatePlan, pushHistory])

  // 呈现阶段：给某个节点设置/替换/清掉图片——比如"这一点实际用了什么技术"配一张截图；
  // dataUrl 传 null 表示清掉这张图（跟 editNode 分开成独立函数，因为"清掉"跟"留空不动"的语义不一样，
  // editNode 的 patch 是"只改传了的字段"，用它表达"清空"会有歧义）
  const setNodeImage = useCallback((nodeId: string, dataUrl: string | null) => {
    if (!plan?.root) return
    // 清图的同时把图注也一起清掉——图注是依附于这张图的说明文字，没有图留着图注没有意义，
    // 免得下次补一张完全不相关的新图时，旧图注被误当成新图的说明继续带出去
    pushHistory()
    updatePlan(plan.id, (p) => ({ ...p, root: updateNodeById(p.root!, nodeId, (n) => ({ ...n, imageDataUrl: dataUrl ?? undefined, imageCaption: dataUrl ? n.imageCaption : undefined })) }))
  }, [plan, updatePlan, pushHistory])

  // 生成 PPT 前：拖拽调整某条要点（子节点）在同一分支内的位置、以及要不要单独另开一页——
  // 用来把重点内容拖出来单独占一页突出讲，或者把拆开的页拖回去合并。afterNodeId 传 null
  // 表示挪到这个分支最前面；startsNewPage 决定挪动后这个节点要不要另起一页。
  //
  // 关键的坑：splitChildrenIntoPages 的规则是"排在分支第 0 位的要点，天然就是新一页的开头，
  // 不看它自己身上的 pageBreakBefore 标记"。所以"让某条要点单独成一页"这件事，标记永远不能打在
  // 排到第 0 位的那条要点自己身上（打了也白打，检查不到）；如果它排到第 0 位、还想跟后面的隔开，
  // 起作用的其实是"排在它后面那一条"身上的标记。之前的实现无论移到哪都把标记打在被拖动节点自己
  // 身上，移到第 0 位时这个标记完全不起作用，但又不会被清掉，会一直留着——等它以后被挤到非第 0 位，
  // 这个陈旧标记才突然生效，冒出一次跟当下操作毫不相关的分页，看起来完全无法理解。
  const moveKeyPointNode = useCallback((branchId: string, nodeId: string, afterNodeId: string | null, startsNewPage: boolean) => {
    if (!plan?.root) return
    pushHistory()
    updatePlan(plan.id, (p) => ({
      ...p,
      root: updateNodeById(p.root!, branchId, (branch) => {
        const moving = branch.children.find((c) => c.id === nodeId)
        if (!moving) return branch

        // afterNodeId 是被拖动的节点自己，说明这不是要挪位置（挪到"自己后面"没有意义），
        // 是"原地"改这条要点的翻页标记——比如把卡片里最后一条要点拖到它自己卡片正下方的缝隙，
        // 意思是让它自己单独成一页，位置不变，只改标记；此时它在原数组里的下标就是最终位置
        const isInPlace = nodeId === afterNodeId
        const rest = isInPlace ? branch.children : branch.children.filter((c) => c.id !== nodeId)
        const insertIndex = isInPlace
          ? branch.children.findIndex((c) => c.id === nodeId)
          : (afterNodeId ? rest.findIndex((c) => c.id === afterNodeId) + 1 : 0)

        const movedNode = { ...moving, pageBreakBefore: undefined as true | undefined }
        const children = isInPlace
          ? rest.map((c) => (c.id === nodeId ? movedNode : c))
          : [...rest.slice(0, insertIndex), movedNode, ...rest.slice(insertIndex)]

        if (startsNewPage) {
          if (insertIndex === 0) {
            // 排到第 0 位——标记打在自己身上不起作用，改打在紧接着的下一条身上，把自己和后面隔开
            if (children.length > 1) children[1] = { ...children[1], pageBreakBefore: true }
          } else {
            children[insertIndex] = { ...children[insertIndex], pageBreakBefore: true }
          }
        }

        return { ...branch, children }
      })
    }))
  }, [plan, updatePlan, pushHistory])

  // 呈现阶段：在某个节点旁边手动补一个新的兄弟节点——比如实际做的时候多做了一件计划里没有的事，
  // 直接手写标题/描述，不需要走 AI 生成；新节点默认当叶子（不能再往下展开，呈现阶段本来也不做展开了）
  const addSiblingNode = useCallback((afterNodeId: string) => {
    if (!plan?.root) return
    const newNode: TreeNode = {
      id: crypto.randomUUID(),
      title: '新节点',
      description: undefined,
      children: [],
      isLeaf: true,
      confirmed: true,
      isLoading: false
    }

    function insertAfter(node: TreeNode): TreeNode {
      const index = node.children.findIndex((c) => c.id === afterNodeId)
      if (index === -1) {
        return { ...node, children: node.children.map(insertAfter) }
      }
      const children = [...node.children]
      children.splice(index + 1, 0, newNode)
      return { ...node, children }
    }

    pushHistory()
    updatePlan(plan.id, (p) => ({ ...p, root: insertAfter(p.root!) }))
  }, [plan, updatePlan, pushHistory])

  // 选中某条历史记录，不发任何请求
  const selectPlan = useCallback((id: string) => {
    setActivePlanId(id)
    setError(null)
    // 历史栈是跟着"当前正在编辑的这棵树"走的——切换计划后上一棵树的撤回历史没有意义，清空
    setUndoStack([])
    setRedoStack([])
  }, [])

  // 取消选中（不删除数据），用于"新建计划"或从执行视图返回
  const deselectPlan = useCallback(() => {
    setActivePlanId(null)
    setError(null)
  }, [])

  // 删掉一整条计划记录；顺带清掉它可能留下的 PPT 导出会话（按 planId 单独存的，不会跟着 plans 一起消失）
  const deletePlan = useCallback((id: string) => {
    setPlans((cur) => cur.filter((p) => p.id !== id))
    setActivePlanId((cur) => (cur === id ? null : cur))
    window.api.clearPptxExportSession(id)
  }, [])

  return {
    plan, plans, activePlanId, isGenerating, error, isRestored,
    startUnderstanding, answerCurrentQuestion, editUnderstandingField,
    refineUnderstandingDraft, confirmUnderstanding,
    editRestructureField, refineRestructureDraft, confirmRestructure, confirmTree,
    frontierCount, confirmFrontier, lastExpandedIds, refineFrontier, editNode, rewriteNode,
    undo, redo, canUndo: undoStack.length > 0, canRedo: redoStack.length > 0,
    deleteNode, addSiblingNode, setNodeImage, moveKeyPointNode,
    selectPlan, deselectPlan, deletePlan
  }
}
