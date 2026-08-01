import { useState } from 'react'
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react'
import type { Plan, TreeNode } from '@shared/index'
import { PHASES } from './PhaseStepper'

function countNodes(node: TreeNode): { total: number; confirmed: number } {
  let total = 1
  let confirmed = node.confirmed ? 1 : 0
  for (const child of node.children) {
    const sub = countNodes(child)
    total += sub.total
    confirmed += sub.confirmed
  }
  return { total, confirmed }
}

function describeProgress(plan: Plan): string {
  const phaseLabel = PHASES.find((p) => p.key === plan.phase)?.label ?? ''
  if (!plan.root) return `${phaseLabel} · 结构拟定中`

  const { total, confirmed } = countNodes(plan.root)
  if (total > 0 && confirmed === total) return `${phaseLabel} · 已全部完成`
  return `${phaseLabel} · ${confirmed}/${total} 步已确认`
}

function formatRelativeTime(timestamp: number): string {
  const diffMs = Date.now() - timestamp
  const minute = 60 * 1000
  const hour = 60 * minute
  const day = 24 * hour

  if (diffMs < minute) return '刚刚'
  if (diffMs < hour) return `${Math.floor(diffMs / minute)} 分钟前`
  if (diffMs < day) return `${Math.floor(diffMs / hour)} 小时前`
  if (diffMs < 2 * day) return '昨天'
  return `${Math.floor(diffMs / day)} 天前`
}

interface PlanListItemProps {
  plan: Plan
  selected: boolean
  disabled?: boolean
  onClick: () => void
  onDelete: () => void
}

function PlanListItem({ plan, selected, disabled, onClick, onDelete }: PlanListItemProps) {
  const handleDelete = () => {
    if (window.confirm('删除这个计划？删掉之后没法恢复。')) onDelete()
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`group relative w-full rounded-xl px-3 py-2.5 text-left transition disabled:cursor-not-allowed disabled:opacity-50 ${
        selected ? 'bg-neutral-100' : 'hover:bg-neutral-50'
      }`}
    >
      <div className="flex flex-col gap-0.5 pr-5">
        <span className="truncate text-sm font-medium text-neutral-800">{plan.task}</span>
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-xs text-neutral-400">{describeProgress(plan)}</span>
          <span className="shrink-0 text-xs text-neutral-300">{formatRelativeTime(plan.updatedAt)}</span>
        </span>
      </div>
      {!disabled && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation()
            handleDelete()
          }}
          title="删除这个计划"
          className="absolute right-2 top-2.5 rounded p-0.5 text-neutral-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
        >
          <X size={13} />
        </span>
      )}
    </button>
  )
}

interface SidebarProps {
  plans: Plan[]
  activePlanId: string | null
  isGenerating: boolean
  onSelectPlan: (id: string) => void
  onNewPlan: () => void
  onDeletePlan: (id: string) => void
}

export function Sidebar({ plans, activePlanId, isGenerating, onSelectPlan, onNewPlan, onDeletePlan }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)

  const sorted = [...plans].sort((a, b) => b.updatedAt - a.updatedAt)

  if (collapsed) {
    return (
      <div className="flex w-12 flex-col items-center border-r border-neutral-100 py-3">
        <button
          onClick={() => setCollapsed(false)}
          className="rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-700"
          title="展开侧边栏"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="flex w-64 shrink-0 flex-col border-r border-neutral-100">
      <div className="flex items-center justify-between px-3 py-3">
        <button
          onClick={onNewPlan}
          disabled={isGenerating}
          className="flex flex-1 items-center gap-2 rounded-xl bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Plus size={15} />
          新建计划
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="ml-1.5 rounded-lg p-1.5 text-neutral-400 transition hover:bg-neutral-50 hover:text-neutral-700"
          title="收起侧边栏"
        >
          <ChevronLeft size={16} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-3">
        {sorted.length > 0 ? (
          <div className="flex flex-col gap-0.5">
            {sorted.map((p) => (
              <PlanListItem
                key={p.id}
                plan={p}
                selected={p.id === activePlanId}
                disabled={isGenerating}
                onClick={() => onSelectPlan(p.id)}
                onDelete={() => onDeletePlan(p.id)}
              />
            ))}
          </div>
        ) : (
          <p className="px-3 py-6 text-center text-xs text-neutral-300">还没有计划，点上面新建一个吧</p>
        )}
      </div>
    </div>
  )
}
