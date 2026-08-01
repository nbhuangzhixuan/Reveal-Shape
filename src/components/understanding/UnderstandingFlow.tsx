import type { FiveWTwoHKey, Plan, RestructureDraft } from '@shared/index'
import { LoadingState } from '../LoadingState'
import { QuestionCard } from './QuestionCard'
import { StructurePanel } from './StructurePanel'
import { UnderstandingReview } from './UnderstandingReview'
import { RestructureReview } from '../restructure/RestructureReview'

interface UnderstandingFlowProps {
  plan: Plan
  isGenerating: boolean
  onAnswer: (answer: string | null) => void
  onEditField: (key: FiveWTwoHKey, value: string) => void
  onRefine: (feedback: string) => void
  onConfirm: () => void
  // 5W2H 确认后，理解阶段内继续推导 AB+SCQA+主题（本质是"把这件事理解清楚"的延伸）——
  // 用户确认主题后才进入重构阶段展开成树
  onEditRestructureField: (key: keyof RestructureDraft, value: string) => void
  onRefineRestructure: (feedback: string) => void
  onConfirmRestructure: () => void
}

export function UnderstandingFlow({
  plan, isGenerating, onAnswer, onEditField, onRefine, onConfirm,
  onEditRestructureField, onRefineRestructure, onConfirmRestructure
}: UnderstandingFlowProps) {
  const understanding = plan.understanding
  const restructure = plan.restructure
  if (!understanding) return null

  if (understanding.status === 'selecting' || understanding.status === 'synthesizing') {
    return <div className="w-full max-w-xl"><LoadingState /></div>
  }

  if (understanding.status === 'asking') {
    const current = understanding.questions[understanding.currentIndex]
    if (!current) return <div className="w-full max-w-xl"><LoadingState /></div>

    return (
      <div className="flex w-full max-w-xl flex-col gap-4">
        <p className="text-sm text-neutral-400">先帮我把「{plan.task}」这件事理清楚</p>
        <QuestionCard
          key={current.key}
          question={current}
          index={understanding.currentIndex}
          total={understanding.questions.length}
          isSubmitting={isGenerating}
          onAnswer={onAnswer}
        />
        <StructurePanel questions={understanding.questions} currentIndex={understanding.currentIndex} />
      </div>
    )
  }

  // 5W2H 已确认，进入理解阶段的第二步：AB+SCQA+主题推导（仍属于"理解清楚这件事"）
  if (understanding.confirmed && restructure?.draft && !restructure.confirmed) {
    return (
      <RestructureReview
        task={plan.task}
        draft={restructure.draft}
        isRefining={isGenerating}
        onEditField={onEditRestructureField}
        onRefine={onRefineRestructure}
        onConfirm={onConfirmRestructure}
      />
    )
  }

  if (understanding.status === 'reviewing' && understanding.draft && understanding.summary) {
    return (
      <UnderstandingReview
        task={plan.task}
        draft={understanding.draft}
        summary={understanding.summary}
        isRefining={isGenerating}
        onEditField={onEditField}
        onRefine={onRefine}
        onConfirm={onConfirm}
      />
    )
  }

  return null
}
