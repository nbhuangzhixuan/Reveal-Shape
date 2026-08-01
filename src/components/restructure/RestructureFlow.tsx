import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { CheckCircle, FileDown, ImageDown, Layers, Presentation, Redo2, Send, Undo2 } from 'lucide-react'
import type { Plan, RestructureDraft, TreeNode } from '@shared/index'
import { downloadTextFile, sanitizeFilename } from '../../lib/export/download'
import { buildMarkdown } from '../../lib/export/markdown'
import { PptxExportModal } from '../export/PptxExportModal'
import { LoadingState } from '../LoadingState'
import { TreeCanvas, type TreeCanvasHandle } from '../tree/TreeCanvas'
import { RestructureReview } from './RestructureReview'

interface RestructureFlowProps {
  plan: Plan
  isGenerating: boolean
  onEditField: (key: keyof RestructureDraft, value: string) => void
  onRefine: (feedback: string) => void
  onConfirmDraft: () => void
  onEditNode: (nodeId: string, patch: { title?: string; description?: string; imageCaption?: string }) => void
  frontierCount: number
  onConfirmFrontier: () => void
  onConfirmTree: () => void
  hasFreshLayer: boolean
  onRefineFrontier: (feedback: string) => void
  onMoveKeyPointNode: (branchId: string, nodeId: string, afterNodeId: string | null, startsNewPage: boolean) => void
  onRewriteNode: (nodeIds: string[], feedback: string) => void
  onUndo: () => void
  onRedo: () => void
  canUndo: boolean
  canRedo: boolean
}

// 树里找 id 对应的节点（广度遍历），找不到返回 null
function findNodeById(root: TreeNode | null, id: string): TreeNode | null {
  if (!root) return null
  const stack: TreeNode[] = [root]
  while (stack.length > 0) {
    const n = stack.pop()!
    if (n.id === id) return n
    stack.push(...n.children)
  }
  return null
}

export function RestructureFlow({
  plan, isGenerating,
  onEditField, onRefine, onConfirmDraft,
  onEditNode, frontierCount, onConfirmFrontier, onConfirmTree,
  hasFreshLayer, onRefineFrontier, onMoveKeyPointNode,
  onRewriteNode, onUndo, onRedo, canUndo, canRedo
}: RestructureFlowProps) {
  const [feedback, setFeedback] = useState('')
  // 选中的改写目标节点 id 集合——支持多选，点选即加入/移出（toggle）
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const canvasRef = useRef<TreeCanvasHandle>(null)
  const [showPptxModal, setShowPptxModal] = useState(false)

  // 选中的节点集合——按 id 逐个从树里找；改写过/撤销后某个 id 可能失效，失效的从集合里剔除
  const selectedNodes = selectedIds
    .map((id) => findNodeById(plan.root, id))
    .filter((n): n is TreeNode => n !== null)

  // 有失效的选中 id（节点被删了）时清理
  useEffect(() => {
    if (selectedIds.length !== selectedNodes.length) {
      setSelectedIds(selectedNodes.map((n) => n.id))
    }
  }, [selectedIds.length, selectedNodes])

  const restructure = plan.restructure
  if (!restructure || !restructure.draft) {
    return <div className="w-full max-w-xl"><LoadingState /></div>
  }

  if (!restructure.confirmed) {
    return (
      <RestructureReview
        task={plan.task}
        draft={restructure.draft}
        isRefining={isGenerating}
        onEditField={onEditField}
        onRefine={onRefine}
        onConfirm={onConfirmDraft}
      />
    )
  }

  // 点选/再点取消选中一个节点
  const toggleSelect = (nodeId: string) => {
    setSelectedIds((cur) => (cur.includes(nodeId) ? cur.filter((id) => id !== nodeId) : [...cur, nodeId]))
  }

  // 提交改写：只在有选中节点时可用（对话框只在有选中节点时显示）
  const submitRewrite = () => {
    const trimmed = feedback.trim()
    if (!trimmed || isGenerating || selectedNodes.length === 0) return
    onRewriteNode(selectedNodes.map((n) => n.id), trimmed)
    setFeedback('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    submitRewrite()
  }

  return (
    <div className="flex h-full w-full flex-col gap-4">
      <div className="flex items-center justify-between gap-4">
        <p className="text-sm text-neutral-400">看看这一层对不对，觉得没问题就往下展开一层</p>
        <div className="flex shrink-0 items-center gap-3">
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title="撤销上一步修改"
            className="text-neutral-400 transition hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Undo2 size={15} />
          </button>
          <button
            onClick={onRedo}
            disabled={!canRedo}
            title="重做"
            className="text-neutral-400 transition hover:text-neutral-700 disabled:cursor-not-allowed disabled:opacity-30"
          >
            <Redo2 size={15} />
          </button>
          <button
            onClick={() => downloadTextFile(`${sanitizeFilename(plan.task)}.md`, buildMarkdown(plan), 'text/markdown')}
            title="导出 Markdown"
            className="text-neutral-400 transition hover:text-neutral-700"
          >
            <FileDown size={15} />
          </button>
          <button onClick={() => canvasRef.current?.exportImage()} title="导出为图片"
            className="text-neutral-400 transition hover:text-neutral-700">
            <ImageDown size={15} />
          </button>
          <button onClick={() => setShowPptxModal(true)} title="生成 PPT"
            className="text-neutral-400 transition hover:text-neutral-700">
            <Presentation size={15} />
          </button>
        </div>
      </div>
      <div className="min-h-0 flex-1">
        <TreeCanvas
          ref={canvasRef}
          plan={plan}
          onEditNode={onEditNode}
          selectedNodeIds={selectedIds}
          onSelectNode={toggleSelect}
        />
      </div>

      {showPptxModal && (
        <PptxExportModal plan={plan} onClose={() => setShowPptxModal(false)} onMoveKeyPointNode={onMoveKeyPointNode} />
      )}

      {/* 没有选中节点时不显示对话框，只提示怎么进入多选；选中后才出现共享对话框 */}
      {selectedNodes.length === 0 ? (
        <div className="border-t border-neutral-100 pt-3">
          <p className="text-sm text-neutral-400">点节点右上角 ✨ 选择要改的节点（可多选），在下方输入修改要求。</p>
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 border-t border-neutral-100 pt-3">
          <p className="text-xs text-neutral-400">
            已选 {selectedNodes.length} 个：<span className="font-medium text-neutral-600">{selectedNodes.map((n) => n.title).join('、')}</span>
          </p>
          <div className="flex gap-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="说一句你想怎么改"
              rows={1}
              disabled={isGenerating}
              className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-neutral-400 disabled:opacity-50"
            />
            <button
              onClick={submitRewrite}
              disabled={!feedback.trim() || isGenerating}
              className="shrink-0 rounded-xl bg-neutral-900 p-2.5 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>
      )}

      {frontierCount > 0 ? (
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirmFrontier}
            disabled={isGenerating}
            className="flex items-center justify-center gap-2 rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Layers size={16} />
            {isGenerating ? '正在展开...' : `这一层没问题，展开下一层（${frontierCount} 个节点）`}
          </button>
          <button
            onClick={onConfirmTree}
            disabled={isGenerating}
            className="text-xs text-neutral-400 transition hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            不用再展开了，直接去呈现
          </button>
        </div>
      ) : (
        <button
          onClick={onConfirmTree}
          disabled={isGenerating}
          className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle size={16} />
          结构没问题，去呈现
        </button>
      )}
    </div>
  )
}
