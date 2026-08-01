import { motion } from 'framer-motion'

interface SummaryConfirmModalProps {
  title: string
  summary: string
  onReject: () => void
  onConfirm: () => void
}

export function SummaryConfirmModal({ title, summary, onReject, onConfirm }: SummaryConfirmModalProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4"
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <h2 className="mb-3 text-base font-semibold text-neutral-800">{title}</h2>
        <p className="mb-6 text-sm leading-relaxed text-neutral-700">{summary}</p>
        <div className="flex gap-2">
          <button
            onClick={onReject}
            className="flex-1 rounded-full border border-neutral-200 py-2.5 text-sm font-medium text-neutral-600 transition hover:bg-neutral-50"
          >
            有问题
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-full bg-emerald-600 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-500"
          >
            没问题
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
