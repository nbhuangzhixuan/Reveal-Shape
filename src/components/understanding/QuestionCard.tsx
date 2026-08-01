import { useState, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle, Sparkles } from 'lucide-react'
import type { UnderstandingQuestion } from '@shared/index'

interface QuestionCardProps {
  question: UnderstandingQuestion
  index: number
  total: number
  isSubmitting: boolean
  onAnswer: (answer: string | null) => void
}

export function QuestionCard({ question, index, total, isSubmitting, onAnswer }: QuestionCardProps) {
  const [value, setValue] = useState('')

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || isSubmitting) return
    onAnswer(trimmed)
    setValue('')
  }

  const skip = () => {
    if (isSubmitting) return
    onAnswer(null)
    setValue('')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.ctrlKey || e.metaKey) return
    e.preventDefault()
    submit()
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col gap-3 rounded-2xl border border-neutral-100 bg-white p-5 shadow-sm"
    >
      <p className="text-xs text-neutral-400">第 {index + 1} / {total} 题</p>
      <p className="text-base font-medium text-neutral-800">{question.question}</p>
      <textarea
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="说说你的想法..."
        rows={3}
        disabled={isSubmitting}
        className="w-full resize-none rounded-xl border border-neutral-200 px-3 py-2.5 text-sm text-neutral-800 outline-none transition focus:border-neutral-400 disabled:opacity-50"
      />
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={skip}
          disabled={isSubmitting}
          className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-xs font-medium text-amber-700 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Sparkles size={13} />
          想不出来，AI 帮我来判断吧
        </button>
        <button
          onClick={submit}
          disabled={!value.trim() || isSubmitting}
          className="flex items-center gap-1.5 rounded-full bg-emerald-600 px-4 py-2 text-xs font-medium text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle size={13} />
          下一步
        </button>
      </div>
    </motion.div>
  )
}
