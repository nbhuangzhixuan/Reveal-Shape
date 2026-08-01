import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { FileDown, ImageDown, Presentation, RotateCcw } from 'lucide-react'
import type { Plan } from '@shared/index'
import { downloadTextFile, sanitizeFilename } from '../lib/export/download'
import { buildMarkdown } from '../lib/export/markdown'
import { PptxExportModal } from './export/PptxExportModal'
import { TreeCanvas, type TreeCanvasHandle } from './tree/TreeCanvas'

interface PlanViewProps {
  plan: Plan
  onReset: () => void
  onEditNode: (nodeId: string, patch: { title?: string; description?: string; imageCaption?: string }) => void
  onDeleteNode: (nodeId: string) => void
  onAddSiblingNode: (afterNodeId: string) => void
  onSetNodeImage: (nodeId: string, dataUrl: string | null) => void
  onMoveKeyPointNode: (branchId: string, nodeId: string, afterNodeId: string | null, startsNewPage: boolean) => void
}

export function PlanView({ plan, onReset, onEditNode, onDeleteNode, onAddSiblingNode, onSetNodeImage, onMoveKeyPointNode }: PlanViewProps) {
  const canvasRef = useRef<TreeCanvasHandle>(null)
  const [showPptxModal, setShowPptxModal] = useState(false)

  const exportMarkdown = () => {
    downloadTextFile(`${sanitizeFilename(plan.task)}.md`, buildMarkdown(plan), 'text/markdown')
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      className="flex h-full w-full flex-col gap-4"
    >
      {/* 任务标题 + 导出 + 重置 */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <p className="text-base font-medium text-neutral-800">{plan.task}</p>
          <span className="text-xs text-neutral-400">点文字可改</span>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button onClick={exportMarkdown} title="导出 Markdown"
            className="text-neutral-400 transition hover:text-neutral-700">
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
          <button onClick={onReset} title="返回，开始新的计划"
            className="text-neutral-400 transition hover:text-neutral-700">
            <RotateCcw size={15} />
          </button>
        </div>
      </div>

      {/* 呈现阶段也允许直接点字编辑、加节点、删节点——比如把"计划要做什么"改写成"实际做了什么"，
          删掉没做的事、补上计划外多做的事，再生成 PPT 给别人看 */}
      <div className="min-h-0 flex-1">
        <TreeCanvas ref={canvasRef} plan={plan} onEditNode={onEditNode} onDeleteNode={onDeleteNode} onAddSiblingNode={onAddSiblingNode} onSetNodeImage={onSetNodeImage} />
      </div>

      {showPptxModal && (
        <PptxExportModal plan={plan} onClose={() => setShowPptxModal(false)} onMoveKeyPointNode={onMoveKeyPointNode} />
      )}
    </motion.div>
  )
}
