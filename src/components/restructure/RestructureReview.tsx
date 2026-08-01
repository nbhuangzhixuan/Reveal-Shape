import { useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Send } from 'lucide-react'
import type { RestructureDraft } from '@shared/index'
import { buildNarrative } from '../../lib/narrative'
import { SummaryConfirmModal } from '../SummaryConfirmModal'

interface FieldConfig {
  key: keyof RestructureDraft
  label: string
  hint: string
}

const AB_FIELDS: FieldConfig[] = [
  { key: 'audience', label: '受众', hint: '这件事是做给谁看、为了谁——没有外部读者可以就是"自己"' },
  { key: 'behavior', label: '期望行为', hint: '希望对方（或自己）完成后达成什么状态、做出什么行动' }
]

const SCQA_FIELDS: FieldConfig[] = [
  { key: 'situation', label: '现状', hint: '双方认可的背景' },
  { key: 'complication', label: '冲突', hint: '现状里的矛盾或触发点' },
  { key: 'question', label: '核心疑问', hint: '冲突自然引出的问题' },
  { key: 'answer', label: '初步答案', hint: '对这个疑问的回答' }
]

interface RestructureReviewProps {
  task: string
  draft: RestructureDraft
  isRefining: boolean
  onEditField: (key: keyof RestructureDraft, value: string) => void
  onRefine: (feedback: string) => void
  onConfirm: () => void
}

export function RestructureReview({ task, draft, isRefining, onEditField, onRefine, onConfirm }: RestructureReviewProps) {
  const [feedback, setFeedback] = useState('')
  const [showSummaryModal, setShowSummaryModal] = useState(false)

  const submitFeedback = () => {
    const trimmed = feedback.trim()
    if (!trimmed || isRefining) return
    onRefine(trimmed)
    setFeedback('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    submitFeedback()
  }

  const handleSummaryConfirm = () => {
    setShowSummaryModal(false)
    onConfirm()
  }

  const renderField = (field: FieldConfig) => (
    <div key={field.key} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-medium text-neutral-500">{field.label}</span>
        <span className="text-xs text-neutral-300">· {field.hint}</span>
      </div>
      <textarea
        value={draft[field.key]}
        onChange={(e) => onEditField(field.key, e.target.value)}
        rows={2}
        className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-neutral-400"
      />
    </div>
  )

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        className="flex w-full max-w-xl flex-col gap-4"
      >
        <div className="flex flex-col gap-1">
          <p className="text-base font-medium text-neutral-800">{task}</p>
          <p className="text-xs text-neutral-400">看看这份推导对不对，不对的地方直接改。</p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          <div className="flex flex-col gap-3">
            <p className="text-xs font-medium text-neutral-400">为谁、为了什么</p>
            {AB_FIELDS.map(renderField)}
          </div>

          <div className="flex flex-col gap-3 border-t border-neutral-100 pt-4">
            <p className="text-xs font-medium text-neutral-400">序言故事</p>
            {SCQA_FIELDS.map(renderField)}
          </div>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="text-xs font-medium text-emerald-600">核心主题</p>
          <textarea
            value={draft.theme}
            onChange={(e) => onEditField('theme', e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-emerald-200 bg-white px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-emerald-400"
          />
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          <p className="text-xs font-medium text-neutral-500">受众听完主题，接下来会问</p>
          <textarea
            value={draft.audienceQuestion}
            onChange={(e) => onEditField('audienceQuestion', e.target.value)}
            rows={2}
            className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-neutral-400"
          />
        </div>

        <div className="flex flex-col gap-1.5 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-400">整体不满意？说一句，我来重新生成。</p>
          <div className="flex gap-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：受众其实是团队评审，不是我自己"
              rows={2}
              disabled={isRefining}
              className="flex-1 resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-neutral-400 disabled:opacity-50"
            />
            <button
              onClick={submitFeedback}
              disabled={!feedback.trim() || isRefining}
              className="self-end rounded-xl bg-neutral-900 p-2.5 text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Send size={15} />
            </button>
          </div>
        </div>

        <button
          onClick={() => setShowSummaryModal(true)}
          disabled={isRefining}
          className="flex items-center justify-center gap-2 rounded-full bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle size={16} />
          主题没问题，去查看概括版
        </button>
      </motion.div>

      {showSummaryModal && (
        <SummaryConfirmModal
          title="这就是要讲的这件事"
          summary={buildNarrative(draft)}
          onReject={() => setShowSummaryModal(false)}
          onConfirm={handleSummaryConfirm}
        />
      )}
    </>
  )
}
