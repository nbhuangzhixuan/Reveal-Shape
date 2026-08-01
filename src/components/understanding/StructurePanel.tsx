import { Check, Circle } from 'lucide-react'
import type { UnderstandingQuestion } from '@shared/index'
import { FIVE_W_TWO_H_LABELS, FIVE_W_TWO_H_ORDER } from './fiveWTwoH'

interface StructurePanelProps {
  questions: UnderstandingQuestion[]
  currentIndex: number
}

export function StructurePanel({ questions, currentIndex }: StructurePanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-neutral-100 bg-neutral-50 px-4 py-3">
      <p className="px-1 text-xs font-medium text-neutral-400">结构正在成形</p>
      <div className="flex flex-col gap-1.5">
        {FIVE_W_TWO_H_ORDER.map((key) => {
          const label = FIVE_W_TWO_H_LABELS[key]
          const qIdx = questions.findIndex((q) => q.key === key)
          const isAsked = qIdx !== -1
          const question = isAsked ? questions[qIdx] : null
          const isAnswered = isAsked && qIdx < currentIndex
          const isCurrent = isAsked && qIdx === currentIndex

          let hint: string
          if (!isAsked) hint = 'AI 估算'
          else if (isAnswered) hint = question!.skipped ? '已跳过，交给 AI' : (question!.answer ?? '')
          else if (isCurrent) hint = '正在问'
          else hint = '待会问'

          return (
            <div key={key} className="flex items-center gap-2 px-1 text-xs">
              {isAnswered ? (
                <Check size={12} className="shrink-0 text-emerald-500" />
              ) : isCurrent ? (
                <span className="shrink-0 text-sm leading-none text-neutral-800">●</span>
              ) : (
                <Circle size={10} className="shrink-0 text-neutral-300" />
              )}
              <span className={`shrink-0 font-medium ${isAnswered ? 'text-neutral-700' : isCurrent ? 'text-neutral-800' : 'text-neutral-400'}`}>
                {label.short}
              </span>
              <span className="truncate text-neutral-400">{hint}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
