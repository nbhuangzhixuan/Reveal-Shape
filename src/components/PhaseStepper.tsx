import { Check } from 'lucide-react'
import type { Phase } from '@shared/index'

export type { Phase }

export const PHASES: { key: Phase; label: string; hint: string }[] = [
  { key: 'understand', label: '理解', hint: '看清这件事的结构' },
  { key: 'restructure', label: '重构', hint: '重新组织成能走的路径' },
  { key: 'present', label: '呈现', hint: '一步步搭建、执行' }
]

interface PhaseStepperProps {
  current: Phase
  onSelect: (phase: Phase) => void
}

export function PhaseStepper({ current, onSelect }: PhaseStepperProps) {
  // 'idle'（未选中任何计划）不在 PHASES 里，currentIndex 为 -1——三个阶段都不高亮、都不算已走过
  const currentIndex = current === 'idle' ? -1 : PHASES.findIndex((p) => p.key === current)

  return (
    <div className="flex items-center justify-center gap-1 border-b border-neutral-100 px-5 py-3">
      {PHASES.map((phase, i) => {
        const isActive = phase.key === current
        const isPast = i < currentIndex

        return (
          <div key={phase.key} className="flex items-center">
            <button
              onClick={() => onSelect(phase.key)}
              title={phase.hint}
              className="flex items-center gap-2 rounded-full px-2 py-1 transition hover:bg-neutral-50"
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium transition ${
                  isActive
                    ? 'bg-neutral-900 text-white'
                    : isPast
                      ? 'bg-emerald-100 text-emerald-600'
                      : 'bg-neutral-100 text-neutral-400'
                }`}
              >
                {isPast ? <Check size={11} /> : i + 1}
              </span>
              <span
                className={`text-sm transition ${
                  isActive ? 'font-medium text-neutral-800' : 'text-neutral-400 hover:text-neutral-600'
                }`}
              >
                {phase.label}
              </span>
            </button>
            {i < PHASES.length - 1 && <span className="mx-2 h-px w-8 bg-neutral-200" />}
          </div>
        )
      })}
    </div>
  )
}
