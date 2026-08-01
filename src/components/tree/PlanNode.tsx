import { useState, type KeyboardEvent } from 'react'
import { Handle, Position, type NodeProps } from '@xyflow/react'
import { Circle, ImagePlus, Loader2, Plus, Sparkles, X } from 'lucide-react'
import type { TreeNode } from '@shared/index'

export interface PlanNodeData {
  node: TreeNode
  readOnly: boolean
  onEditNode: (nodeId: string, patch: { title?: string; description?: string; imageCaption?: string }) => void
  // 没传（undefined）说明这个节点不允许删/不允许在它旁边加兄弟节点——目前只有根节点是这样
  onDeleteNode?: (nodeId: string) => void
  onAddSiblingNode?: (afterNodeId: string) => void
  // 给节点补图（比如"这一点实际用了什么技术"配一张截图）——生成 PPT 时会原样用在对应页面里
  onSetNodeImage?: (nodeId: string, dataUrl: string | null) => void
  // 重构阶段：这个节点是否被选中（共享对话框的改写目标之一）；多选，点右上角 ✨ 按钮加入/取消
  selected?: boolean
  // 点节点右上角 ✨ 按钮时回调——父组件 toggle 这个节点是否选中，底部共享对话框据此确定改写目标集合。
  // 选中的操作放在按钮上而不是整卡点击，是为了不跟"点标题/描述就地编辑"冲突
  onSelectNode?: (nodeId: string) => void
  // 根节点的标题是重构阶段生成的"主题句"（一句完整的话），不是普通子节点那种 4-12 字的短标题，
  // 不能用同一种单行省略号截断的展示方式，要允许换行显示全部内容
  isRoot: boolean
  // 定义了就说明这个节点是"有先后顺序"的一批兄弟节点之一，值是第几步（从 1 开始）
  order?: number
  [key: string]: unknown
}

export function PlanNode({ data }: NodeProps & { data: PlanNodeData }) {
  const { node, readOnly, onEditNode, onDeleteNode, onAddSiblingNode, onSetNodeImage, selected, onSelectNode, isRoot, order } = data
  const [editingField, setEditingField] = useState<'title' | 'description' | 'imageCaption' | null>(null)
  const [draft, setDraft] = useState('')
  const [imageError, setImageError] = useState<string | null>(null)

  // 前沿节点：还没往下展开的分支，是"接着往下想"的落点——唯一需要视觉突出的状态
  const isFrontier = !node.isLeaf && node.children.length === 0 && !node.isLoading

  const startEdit = (field: 'title' | 'description' | 'imageCaption') => {
    if (readOnly) return
    setDraft(field === 'title' ? node.title : field === 'description' ? node.description ?? '' : node.imageCaption ?? '')
    setEditingField(field)
  }

  const commitEdit = () => {
    if (editingField) onEditNode(node.id, { [editingField]: draft.trim() })
    setEditingField(null)
  }

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') commitEdit()
    if (e.key === 'Escape') setEditingField(null)
  }

  const handleDelete = () => {
    if (!onDeleteNode) return
    const warning = node.children.length > 0
      ? '删除这个节点会连同它下面的所有子节点一起删掉，确定吗？'
      : '删除这个节点，确定吗？'
    if (window.confirm(warning)) onDeleteNode(node.id)
  }

  const handlePickImage = async () => {
    if (!onSetNodeImage) return
    setImageError(null)
    try {
      const dataUrl = await window.api.chooseImageFile()
      if (dataUrl) onSetNodeImage(node.id, dataUrl)
    } catch (err) {
      setImageError(err instanceof Error ? err.message : '选择图片失败')
    }
  }

  return (
    <div
      className={`group relative flex w-full flex-col gap-1 rounded-2xl border bg-white px-3.5 py-2.5 shadow-sm transition hover:shadow-md ${
        // 根节点父层没有固定高度（让卡片跟着文字自动撑高/收窄），h-full 在这种场景下算不出高度会塌成 0，
        // 改用 h-auto 让自己按内容撑开；其余节点父层是固定高度，继续用 h-full 撑满
        isRoot ? 'h-auto overflow-visible' : 'h-full overflow-hidden'
      } ${isFrontier ? 'border-amber-200 bg-amber-50/40' : 'border-neutral-200'} ${
        selected ? 'ring-2 ring-neutral-800/70' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} style={{ visibility: 'hidden' }} />

      <div className="flex items-start gap-1.5">
        {typeof order === 'number' && (
          <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-700 text-[9px] font-semibold text-white">
            {order}
          </span>
        )}

        {node.isLoading ? (
          <Loader2 size={13} className="mt-0.5 shrink-0 animate-spin text-neutral-400" />
        ) : isFrontier ? (
          <Circle size={12} className="mt-0.5 shrink-0 fill-amber-300 text-amber-300" />
        ) : (
          <Circle size={12} className="mt-0.5 shrink-0 text-neutral-300" />
        )}

        {editingField === 'title' ? (
          isRoot ? (
            <textarea
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => {
                if (e.key === 'Escape') setEditingField(null)
              }}
              onClick={(e) => e.stopPropagation()}
              rows={3}
              className="nodrag nopan min-w-0 flex-1 resize-none rounded border border-neutral-300 px-1.5 py-0.5 text-sm text-neutral-800 outline-none"
            />
          ) : (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              className="nodrag nopan min-w-0 flex-1 rounded border border-neutral-300 px-1.5 py-0.5 text-sm text-neutral-800 outline-none"
            />
          )
        ) : (
          <span
            onClick={(e) => {
              e.stopPropagation()
              startEdit('title')
            }}
            title={isRoot ? undefined : node.title}
            className={`min-w-0 flex-1 text-sm text-neutral-800 ${isRoot ? 'whitespace-normal' : 'truncate'} ${readOnly ? '' : 'nodrag nopan cursor-text hover:text-neutral-600'}`}
          >
            {node.title}
          </span>
        )}

        {/* 补图 / 补一件计划外做的事 / 删掉一件没做的事——只在鼠标悬停时显示，不干扰正常浏览；
            改成标题行里正常排布的一项（而不是绝对定位悬浮在标题上方），这样即使标题换行到多行
            （根节点）或很长（普通节点），也永远不会被这些按钮盖住文字——按钮固定占住自己的宽度，
            标题文字自动让出这部分空间，两者是"挤开"而不是"叠在一起"。
            根节点没有加节点/删节点按钮（onAddSiblingNode/onDeleteNode 未定义），因为根节点是整件事本身，
            删不掉、也没有"兄弟节点"这个概念；补图按钮不受这个限制，根节点也能配图 */}
        {!readOnly && (onAddSiblingNode || onDeleteNode || onSetNodeImage || onSelectNode) && (
          <div className="nodrag nopan flex shrink-0 gap-1 self-start opacity-0 transition group-hover:opacity-100">
            {onSelectNode && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectNode(node.id)
                }}
                title={selected ? '取消选中，不参与这次 AI 改写' : '选中这个节点，参与底部 AI 改写'}
                className={`rounded p-0.5 transition hover:bg-neutral-100 ${selected ? 'text-neutral-800' : 'text-neutral-300 hover:text-neutral-600'}`}
              >
                <Sparkles size={13} />
              </button>
            )}
            {onSetNodeImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handlePickImage()
                }}
                title={node.imageDataUrl ? '更换图片' : '补一张图（比如用到的技术截图）'}
                className="rounded p-0.5 text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-600"
              >
                <ImagePlus size={13} />
              </button>
            )}
            {onAddSiblingNode && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onAddSiblingNode(node.id)
                }}
                title="在下面补一个节点"
                className="rounded p-0.5 text-neutral-300 transition hover:bg-neutral-100 hover:text-neutral-600"
              >
                <Plus size={13} />
              </button>
            )}
            {onDeleteNode && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleDelete()
                }}
                title="删除这个节点"
                className="rounded p-0.5 text-neutral-300 transition hover:bg-red-50 hover:text-red-500"
              >
                <X size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {editingField === 'description' ? (
        <input
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleEditKeyDown}
          onClick={(e) => e.stopPropagation()}
          className="nodrag nopan w-full rounded border border-neutral-300 px-1.5 py-0.5 text-xs text-neutral-600 outline-none"
        />
      ) : node.description ? (
        <p
          onClick={(e) => {
            e.stopPropagation()
            startEdit('description')
          }}
          title={node.description}
          className={`line-clamp-2 text-xs text-neutral-400 ${readOnly ? '' : 'nodrag nopan cursor-text hover:text-neutral-500'}`}
        >
          {node.description}
        </p>
      ) : null}

      {node.imageDataUrl && (
        <>
          <div className="nodrag nopan relative mt-0.5 h-14 w-full shrink-0 overflow-hidden rounded-lg border border-neutral-100">
            <img src={node.imageDataUrl} alt={node.title} className="h-full w-full object-cover" />
            {!readOnly && onSetNodeImage && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onSetNodeImage(node.id, null)
                }}
                title="删掉这张图"
                className="absolute right-0.5 top-0.5 rounded bg-black/40 p-0.5 text-white opacity-0 transition hover:bg-black/60 group-hover:opacity-100"
              >
                <X size={11} />
              </button>
            )}
          </div>

          {/* 图注：生成 PPT 时会跟图片一起传给生图 prompt，让画面里图片旁边能带上说明文字，
              不是只有图片本身孤零零地贴在画面里。跟标题/描述一样点击进入编辑；只读模式下
              没有图注就什么都不显示，不出现一句无意义的空态提示 */}
          {editingField === 'imageCaption' ? (
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={handleEditKeyDown}
              onClick={(e) => e.stopPropagation()}
              placeholder="给这张图写个图注"
              className="nodrag nopan mt-0.5 w-full shrink-0 rounded border border-neutral-300 px-1.5 py-0.5 text-[11px] text-neutral-600 outline-none"
            />
          ) : node.imageCaption ? (
            <p
              onClick={(e) => {
                e.stopPropagation()
                startEdit('imageCaption')
              }}
              title={node.imageCaption}
              className={`mt-0.5 shrink-0 truncate text-[11px] text-neutral-500 ${readOnly ? '' : 'nodrag nopan cursor-text hover:text-neutral-600'}`}
            >
              {node.imageCaption}
            </p>
          ) : !readOnly ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                startEdit('imageCaption')
              }}
              className="nodrag nopan mt-0.5 shrink-0 self-start text-[11px] text-neutral-300 transition hover:text-neutral-500"
            >
              + 加图注
            </button>
          ) : null}
        </>
      )}

      {imageError && (
        <p className="text-[10px] text-red-500">{imageError}</p>
      )}

      {isFrontier && (
        <span className="text-[10px] font-medium text-amber-500">还没往下展开</span>
      )}

      <Handle type="source" position={Position.Right} style={{ visibility: 'hidden' }} />
    </div>
  )
}
