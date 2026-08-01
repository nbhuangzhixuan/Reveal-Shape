import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, XCircle, X } from 'lucide-react'
import type { AIProviderConfig, AIProviderName, AppSettings, ImageProviderConfig, ImageResolution } from '@shared/index'

interface SettingsPanelProps {
  settings: AppSettings
  onSave: (settings: AppSettings) => Promise<AppSettings>
  onClose: () => void
  dismissible: boolean
}

const PROVIDER_LABELS: Record<AIProviderName, string> = {
  openai: 'OpenAI',
  anthropic: 'Claude (Anthropic)',
  deepseek: 'DeepSeek',
  custom: '自定义/第三方'
}

const PROVIDER_ORDER: AIProviderName[] = ['openai', 'anthropic', 'deepseek', 'custom']

// 跟参考 skill 保持一致：默认档（2K/medium）够用；4K 只在文字密集、需要更清晰时才升级，价格也更高
const RESOLUTION_ORDER: ImageResolution[] = ['2k', '4k']
const RESOLUTION_LABELS: Record<ImageResolution, string> = {
  '2k': '2K（默认，够清晰）',
  '4k': '4K（文字密集页需要更清晰时用，更贵）'
}

function emptyConfig(provider: AIProviderName): AIProviderConfig {
  return provider === 'custom'
    ? { provider, apiKey: '', model: '', baseUrl: '', protocol: 'openai' }
    : { provider, apiKey: '', model: '', baseUrl: '' }
}

function emptyImageConfig(): ImageProviderConfig {
  return { apiKey: '', model: 'gpt-image-2', baseUrl: '', resolution: '2k' }
}

// 早期版本还有个已废弃的 1K 档，本地存储不受类型检查约束，老用户设置里可能还留着这个已经不存在的 key；
// 读取时就纠正掉，不要让这个死值一直存在（否则分辨率按钮组会显示成"没有任何档位被选中"）
function normalizeImageConfig(config: ImageProviderConfig): ImageProviderConfig {
  if (config.resolution && !RESOLUTION_ORDER.includes(config.resolution)) {
    return { ...config, resolution: '2k' }
  }
  return config
}

function emptyVisionQaConfig(): AIProviderConfig {
  return { provider: 'openai', apiKey: '', model: '', baseUrl: '' }
}

export function SettingsPanel({ settings, onSave, onClose, dismissible }: SettingsPanelProps) {
  const [activeProvider, setActiveProvider] = useState<AIProviderName>(settings.activeProvider)
  const [drafts, setDrafts] = useState<Record<AIProviderName, AIProviderConfig>>(() => {
    const initial = {} as Record<AIProviderName, AIProviderConfig>
    for (const p of PROVIDER_ORDER) {
      initial[p] = settings.providers[p] ?? emptyConfig(p)
    }
    return initial
  })
  const [imageDraft, setImageDraft] = useState<ImageProviderConfig>(() => normalizeImageConfig(settings.imageProvider ?? emptyImageConfig()))
  const [visionQaDraft, setVisionQaDraft] = useState<AIProviderConfig>(() => settings.visionQaProvider ?? emptyVisionQaConfig())
  const [saving, setSaving] = useState(false)
  const [imageTest, setImageTest] = useState<'idle' | 'testing' | 'ok' | 'error'>('idle')
  const [imageTestError, setImageTestError] = useState<string | null>(null)

  useEffect(() => {
    setActiveProvider(settings.activeProvider)
    setDrafts((prev) => {
      const next = { ...prev }
      for (const p of PROVIDER_ORDER) {
        if (settings.providers[p]) next[p] = settings.providers[p]!
      }
      return next
    })
    if (settings.imageProvider) setImageDraft(normalizeImageConfig(settings.imageProvider))
    if (settings.visionQaProvider) setVisionQaDraft(settings.visionQaProvider)
  }, [settings])

  const current = drafts[activeProvider]

  const updateCurrent = (patch: Partial<AIProviderConfig>) => {
    setDrafts((prev) => ({ ...prev, [activeProvider]: { ...prev[activeProvider], ...patch } }))
  }

  const updateImageDraft = (patch: Partial<ImageProviderConfig>) => {
    setImageDraft((prev) => ({ ...prev, ...patch }))
    setImageTest('idle')
    setImageTestError(null)
  }

  const updateVisionQaDraft = (patch: Partial<AIProviderConfig>) => {
    setVisionQaDraft((prev) => ({ ...prev, ...patch }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const providers: AppSettings['providers'] = {}
      for (const p of PROVIDER_ORDER) {
        if (drafts[p].apiKey.trim()) {
          providers[p] = {
            ...drafts[p],
            model: drafts[p].model?.trim() || undefined,
            baseUrl: drafts[p].baseUrl?.trim() || undefined
          }
        }
      }
      const imageProvider = imageDraft.apiKey.trim()
        ? {
            apiKey: imageDraft.apiKey.trim(),
            model: imageDraft.model.trim() || 'gpt-image-2',
            baseUrl: imageDraft.baseUrl?.trim() || undefined,
            resolution: imageDraft.resolution ?? '2k'
          }
        : undefined
      const visionQaProvider = visionQaDraft.apiKey.trim()
        ? {
            ...visionQaDraft,
            model: visionQaDraft.model?.trim() || undefined,
            baseUrl: visionQaDraft.baseUrl?.trim() || undefined
          }
        : undefined
      await onSave({ activeProvider, providers, imageProvider, visionQaProvider })
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const handleTestImageGeneration = async () => {
    setImageTest('testing')
    setImageTestError(null)
    try {
      await window.api.testImageGeneration(
        imageDraft.apiKey.trim(),
        imageDraft.model.trim() || 'gpt-image-2',
        imageDraft.baseUrl?.trim() || undefined
      )
      setImageTest('ok')
    } catch (err) {
      setImageTest('error')
      setImageTestError(err instanceof Error ? err.message : '测试失败，请稍后重试')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/30 px-4"
    >
      {/* 卡片用 my-auto 而不是父层 items-center：内容高、窗口矮时（窗口模式）整体可滚动，
          不会像 flex 居中那样上下被裁掉、滚不到；内容矮时 my-auto 依然垂直居中 */}
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.2 }}
        className="mx-auto my-6 w-full max-w-md rounded-2xl bg-white p-6 shadow-xl"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-neutral-800">设置</h2>
          {dismissible && (
            <button
              onClick={onClose}
              className="text-neutral-400 transition hover:text-neutral-700"
            >
              <X size={18} />
            </button>
          )}
        </div>

        <p className="mb-2 text-xs font-medium text-neutral-500">对话模型（理解 / 重构 / 展开结构）</p>
        <div className="mb-4 flex gap-2">
          {PROVIDER_ORDER.map((p) => (
            <button
              key={p}
              onClick={() => setActiveProvider(p)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                activeProvider === p
                  ? 'bg-neutral-900 text-white'
                  : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
              }`}
            >
              {PROVIDER_LABELS[p]}
            </button>
          ))}
        </div>

        <div className="flex flex-col gap-3">
          {activeProvider === 'custom' && (
            <div className="flex flex-col gap-1.5 text-xs text-neutral-500">
              接口协议（这家第三方服务实际兼容哪种协议）
              <div className="flex gap-2">
                {(['openai', 'anthropic'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => updateCurrent({ protocol: p })}
                    className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition ${
                      (current.protocol ?? 'openai') === p
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                  >
                    {p === 'openai' ? 'OpenAI 兼容' : 'Anthropic 兼容'}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            API Key
            <input
              type="password"
              value={current.apiKey}
              onChange={(e) => updateCurrent({ apiKey: e.target.value })}
              placeholder={`输入 ${PROVIDER_LABELS[activeProvider]} API Key`}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            模型{activeProvider === 'custom' ? '' : '（可选，留空使用默认）'}
            <input
              type="text"
              value={current.model ?? ''}
              onChange={(e) => updateCurrent({ model: e.target.value })}
              placeholder={activeProvider === 'custom' ? '填这家第三方支持的模型名' : '例如 gpt-4o-mini / claude-opus-4-8'}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
            />
          </label>

          <label className="flex flex-col gap-1 text-xs text-neutral-500">
            Base URL{activeProvider === 'custom' ? '（必填，第三方服务的接口地址）' : '（可选，留空用官方地址，也可以填第三方中转地址）'}
            <input
              type="text"
              value={current.baseUrl ?? ''}
              onChange={(e) => updateCurrent({ baseUrl: e.target.value })}
              placeholder={activeProvider === 'custom' ? '例如 https://api.example.com/v1' : '留空使用官方默认地址'}
              className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
            />
          </label>
        </div>

        {activeProvider === 'deepseek' && (
          <div className="mt-4 rounded-xl bg-amber-50 p-3">
            <p className="mb-2 text-xs text-amber-700">
              DeepSeek 暂不支持识图，无法用来做 PPT 生成后的自动质检。如果需要这个质检功能，请在下面单独配置一个支持识图的第三方 API（走 OpenAI 兼容协议）。
            </p>
            <div className="flex flex-col gap-2">
              <input
                type="password"
                value={visionQaDraft.apiKey}
                onChange={(e) => updateVisionQaDraft({ apiKey: e.target.value })}
                placeholder="识图质检服务的 API Key（可选）"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
              <input
                type="text"
                value={visionQaDraft.model ?? ''}
                onChange={(e) => updateVisionQaDraft({ model: e.target.value })}
                placeholder="模型，例如 gpt-4o-mini"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
              <input
                type="text"
                value={visionQaDraft.baseUrl ?? ''}
                onChange={(e) => updateVisionQaDraft({ baseUrl: e.target.value })}
                placeholder="Base URL（可选，留空用官方地址）"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
            </div>
          </div>
        )}

        <div className="mt-5 border-t border-neutral-100 pt-4">
          <p className="mb-2 text-xs font-medium text-neutral-500">
            图片生成（用于生成 PPT，跟上面的对话模型完全独立，可以用不同的服务商）
          </p>
          <div className="flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              API Key
              <input
                type="password"
                value={imageDraft.apiKey}
                onChange={(e) => updateImageDraft({ apiKey: e.target.value })}
                placeholder="输入图片生成服务的 API Key"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              模型
              <input
                type="text"
                value={imageDraft.model}
                onChange={(e) => updateImageDraft({ model: e.target.value })}
                placeholder="gpt-image-2"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
            </label>

            <label className="flex flex-col gap-1 text-xs text-neutral-500">
              Base URL（可选，留空用 OpenAI 官方地址，也可以填第三方中转地址）
              <input
                type="text"
                value={imageDraft.baseUrl ?? ''}
                onChange={(e) => updateImageDraft({ baseUrl: e.target.value })}
                placeholder="留空使用官方默认地址"
                className="rounded-xl border border-neutral-200 px-3 py-2 text-sm text-neutral-800 outline-none focus:border-neutral-400"
              />
            </label>

            <div className="flex flex-col gap-1.5 text-xs text-neutral-500">
              分辨率档位（价格随档位升高）
              <div className="flex gap-2">
                {RESOLUTION_ORDER.map((r) => (
                  <button
                    key={r}
                    onClick={() => updateImageDraft({ resolution: r })}
                    className={`flex-1 rounded-full px-2 py-1.5 text-xs font-medium transition ${
                      (imageDraft.resolution ?? '2k') === r
                        ? 'bg-neutral-900 text-white'
                        : 'bg-neutral-100 text-neutral-500 hover:bg-neutral-200'
                    }`}
                  >
                    {RESOLUTION_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-2 flex items-center justify-between">
            <p className="text-xs text-neutral-400">先测一张图，确认这份配置能用</p>
            <button
              onClick={handleTestImageGeneration}
              disabled={!imageDraft.apiKey.trim() || imageTest === 'testing'}
              className="flex shrink-0 items-center gap-1 rounded-full border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {imageTest === 'testing' && <Loader2 size={12} className="animate-spin" />}
              {imageTest === 'testing' ? '测试中...' : '测试生图'}
            </button>
          </div>
          {imageTest === 'ok' && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600">
              <CheckCircle2 size={13} /> 可以正常生成图片
            </p>
          )}
          {imageTest === 'error' && (
            <p className="mt-1.5 flex items-center gap-1 text-xs text-red-500">
              <XCircle size={13} className="shrink-0" /> {imageTestError}
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving || !current.apiKey.trim() || (activeProvider === 'custom' && !current.baseUrl?.trim())}
          className="mt-5 w-full rounded-full bg-neutral-900 py-2.5 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {saving ? '保存中...' : '保存'}
        </button>
      </motion.div>
    </motion.div>
  )
}
