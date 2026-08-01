import { useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react'
import { motion } from 'framer-motion'
import { Paperclip, Sparkles, X } from 'lucide-react'

interface TaskInputProps {
  onSubmit: (task: string, referenceText?: string) => void
  isGenerating: boolean
  initialValue?: string
}

async function extractFileText(file: File): Promise<string> {
  const ext = file.name.split('.').pop()?.toLowerCase()
  if (ext === 'docx') {
    const buffer = await file.arrayBuffer()
    return window.api.importDocxText(buffer)
  }
  return file.text()
}

export function TaskInput({ onSubmit, isGenerating, initialValue = '' }: TaskInputProps) {
  const [value, setValue] = useState(initialValue)
  const [referenceFileName, setReferenceFileName] = useState<string | null>(null)
  const [referenceText, setReferenceText] = useState<string | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const submit = () => {
    const trimmed = value.trim()
    if (!trimmed || isGenerating) return
    onSubmit(trimmed, referenceText ?? undefined)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== 'Enter' || event.ctrlKey || event.metaKey) return
    event.preventDefault()
    submit()
  }

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setImportError(null)
    setIsImporting(true)
    try {
      const text = (await extractFileText(file)).trim()
      if (!text) {
        setImportError('这个文件里没读到文字内容')
        return
      }
      setReferenceText(text)
      setReferenceFileName(file.name)
    } catch {
      setImportError('导入失败，试试换个文件')
    } finally {
      setIsImporting(false)
    }
  }

  const clearReference = () => {
    setReferenceText(null)
    setReferenceFileName(null)
    setImportError(null)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex w-full max-w-xl flex-col items-center gap-4"
    >
      <div className="flex w-full flex-col gap-1.5">
        <textarea
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="告诉我你要做什么..."
          rows={3}
          className="w-full resize-none rounded-2xl border border-neutral-200 bg-white px-5 py-4 text-lg text-neutral-800 shadow-sm outline-none transition focus:border-neutral-400 focus:shadow-md"
        />
        <p className="px-1 text-xs text-neutral-400">说个大概就行，AI 先给你一个骨架，再慢慢细化。</p>
      </div>

      <div className="flex w-full flex-col gap-1 px-1">
        <input
          ref={fileInputRef}
          type="file"
          accept=".docx,.txt,.md"
          onChange={handleFileChange}
          className="hidden"
        />
        {referenceFileName ? (
          <div className="flex w-fit items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs text-neutral-600">
            <Paperclip size={12} className="text-neutral-400" />
            <span className="max-w-[220px] truncate">{referenceFileName}</span>
            <button onClick={clearReference} className="text-neutral-400 transition hover:text-neutral-700">
              <X size={12} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isGenerating || isImporting}
            className="flex w-fit items-center gap-1.5 text-xs text-neutral-400 transition hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Paperclip size={13} />
            {isImporting ? '导入中...' : '附上参考文件（可选，.docx / .txt / .md）'}
          </button>
        )}
        {importError && <p className="text-xs text-red-500">{importError}</p>}
      </div>

      <button
        onClick={submit}
        disabled={!value.trim() || isGenerating}
        className="flex items-center gap-2 rounded-full bg-neutral-900 px-6 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
      >
        <Sparkles size={16} />
        {isGenerating ? '生成中...' : '生成计划'}
      </button>
    </motion.div>
  )
}
