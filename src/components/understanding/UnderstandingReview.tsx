import { useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Send } from 'lucide-react'
import type { FiveWTwoHDraft, FiveWTwoHKey } from '@shared/index'
import { SummaryConfirmModal } from '../SummaryConfirmModal'
import { FIVE_W_TWO_H_LABELS, FIVE_W_TWO_H_ORDER } from './fiveWTwoH'

interface UnderstandingReviewProps {
  task: string
  draft: FiveWTwoHDraft
  summary: string
  isRefining: boolean
  onEditField: (key: FiveWTwoHKey, value: string) => void
  onRefine: (feedback: string) => void
  onConfirm: () => void
}

export function UnderstandingReview({ task, draft, summary, isRefining, onEditField, onRefine, onConfirm }: UnderstandingReviewProps) {
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
          <p className="text-xs text-neutral-400">看看这份 5W2H 对不对，不对的地方直接改。</p>
        </div>

        <div className="flex flex-col gap-4 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm">
          {FIVE_W_TWO_H_ORDER.map((key) => {
            const item = draft[key]
            const label = FIVE_W_TWO_H_LABELS[key]
            return (
              <div key={key} className="flex flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-medium text-neutral-500">{label.short} · {label.hint}</span>
                  {item.source === 'ai' && (
                    <span className="rounded-full bg-neutral-100 px-1.5 py-0.5 text-[10px] text-neutral-400">AI 估算</span>
                  )}
                </div>
                <textarea
                  value={item.value}
                  onChange={(e) => onEditField(key, e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none transition focus:border-neutral-400"
                />
              </div>
            )
          })}
        </div>

        <div className="flex flex-col gap-1.5 border-t border-neutral-100 pt-4">
          <p className="text-xs text-neutral-400">整体不满意？说一句，我来重新生成。</p>
          <div className="flex gap-2">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="例如：预算部分猜错了，其实是..."
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
          没问题，去查看概括版
        </button>
      </motion.div>

      {showSummaryModal && (
        <SummaryConfirmModal
          title="一句话说清这件事"
          summary={summary}
          onReject={() => setShowSummaryModal(false)}
          onConfirm={handleSummaryConfirm}
        />
      )}
    </>
  )
}
