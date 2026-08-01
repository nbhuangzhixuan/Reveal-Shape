import { ipcMain } from 'electron'
import OpenAI, { toFile } from 'openai'
import type { ImageResolution } from '@shared/index'
import { getSettings } from '../store'

function describeError(error: unknown): string {
  if (error instanceof Error) return error.message
  return '发生未知错误，请稍后重试'
}

// 跟参考 skill 的 scripts/image_gen.py 保持一致：DEFAULT_SIZE = "2560x1440"、DEFAULT_QUALITY = "medium"，
// 4K 档对应 skill 里"文字密集页需要更清晰、或默认结果模糊时"才升级到的 --size 3840x2160 --quality high
const RESOLUTION_PRESETS: Record<ImageResolution, { size: '2560x1440' | '3840x2160'; quality: 'medium' | 'high' }> = {
  '2k': { size: '2560x1440', quality: 'medium' },
  '4k': { size: '3840x2160', quality: 'high' }
}

// 流式生成时，只要还在收到事件就说明请求是活的，不管总共花多久都不该杀；
// 只有连续这么久完全没有新事件，才真正判定为卡死并主动断开
const STALL_TIMEOUT_MS = 60_000
// 非流式兜底路径没有事件可以判断"是否卡死"，只能给一个较宽松的兜底超时
const FALLBACK_TIMEOUT_MS = 5 * 60_000
const MAX_ATTEMPTS = 3
const RETRY_DELAY_MS = 2_000

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

type Size = '2560x1440' | '3840x2160'
type Quality = 'medium' | 'high'
type OnProgress = (partialB64: string, index: number) => void

// 生成出来的样张图片传过来时是不带前缀的纯 base64；用户手动上传的素材图（file-handler.ts 读文件时
// 编码的）带的是完整 data URL 前缀——这里统一剥掉前缀，两种来源都能正常处理
function stripDataUrlPrefix(value: string): string {
  const comma = value.indexOf(',')
  return value.startsWith('data:') && comma !== -1 ? value.slice(comma + 1) : value
}

// 这一轮请求要传给生图接口的输入图，按顺序排——第一张通常是已批准的样张（风格参照），
// 之后是用户手动补的素材图（必须原样保留内容），顺序要跟 slidePrompt.ts 的 PromptImageRef[]
// 完全对应，这样 prompt 里"Image 1/Image 2..."的文字编号才能对上真正传的是哪张图
async function toInputFiles(imagesB64: string[]) {
  return Promise.all(
    imagesB64.map((b64, i) => toFile(Buffer.from(stripDataUrlPrefix(b64), 'base64'), `input-${i + 1}.png`, { type: 'image/png' }))
  )
}

// 流式路径：陆续收到阶段性预览图，60 秒静默无事件才判定卡死并主动中断
async function generateImageStreaming(
  client: OpenAI,
  model: string,
  prompt: string,
  size: Size,
  quality: Quality,
  imagesB64: string[],
  onProgress?: OnProgress
): Promise<string> {
  const stream = imagesB64.length > 0
    ? await client.images.edit({ model, prompt, image: await toInputFiles(imagesB64), size, quality, stream: true, partial_images: 2 })
    : await client.images.generate({ model, prompt, size, quality, stream: true, partial_images: 2 })
  const iterator = stream[Symbol.asyncIterator]()
  let finalB64: string | undefined

  while (true) {
    const stallTimer = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error('生成过程中长时间没有响应，可能已卡住')), STALL_TIMEOUT_MS)
    })
    const { value, done } = await Promise.race([iterator.next(), stallTimer]).catch((err) => {
      stream.controller.abort()
      throw err
    })
    if (done) break
    if (value.type === 'image_generation.partial_image' || value.type === 'image_edit.partial_image') {
      onProgress?.(value.b64_json, value.partial_image_index)
    } else if (value.type === 'image_generation.completed' || value.type === 'image_edit.completed') {
      finalB64 = value.b64_json
    }
  }

  if (!finalB64) {
    throw new Error('图像生成未返回最终内容')
  }
  return finalB64
}

// 非流式兜底路径：第三方中转不支持流式时用这个，没有阶段性进度可看
async function generateImagePlain(
  client: OpenAI,
  model: string,
  prompt: string,
  size: Size,
  quality: Quality,
  imagesB64: string[]
): Promise<string> {
  const res = imagesB64.length > 0
    ? await client.images.edit({ model, prompt, image: await toInputFiles(imagesB64), size, quality })
    : await client.images.generate({ model, prompt, size, quality })
  const b64 = res.data?.[0]?.b64_json
  if (!b64) {
    throw new Error('图像生成未返回内容')
  }
  return b64
}

async function generateImage(
  apiKey: string,
  model: string,
  baseUrl: string | undefined,
  prompt: string,
  resolution: ImageResolution,
  imagesB64: string[],
  onProgress?: OnProgress
): Promise<string> {
  // 老版本存过 '1k'（已废弃档位，低于 gpt-image-2 官方最小像素限制），本地存储不受类型检查约束，
  // 旧用户重新打开软件时 settings 里可能仍是这个已经不存在的 key；直接查表会拿到 undefined 导致崩溃，
  // 兜底退回默认档而不是让整个生成流程炸掉
  const preset = RESOLUTION_PRESETS[resolution] ?? RESOLUTION_PRESETS['2k']
  const { size, quality } = preset
  const client = new OpenAI({ apiKey, baseURL: baseUrl, timeout: FALLBACK_TIMEOUT_MS })

  let lastError: unknown
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      try {
        return await generateImageStreaming(client, model, prompt, size, quality, imagesB64, onProgress)
      } catch {
        // 流式请求本身报错（很可能是第三方中转不支持 stream/partial_images），同一次尝试里立刻回退成普通请求
        return await generateImagePlain(client, model, prompt, size, quality, imagesB64)
      }
    } catch (error) {
      lastError = error
      if (attempt < MAX_ATTEMPTS) await sleep(RETRY_DELAY_MS * attempt)
    }
  }
  throw lastError
}

export function registerImageHandlers(): void {
  // inputImagesB64 按顺序排：一般是[已批准的样张风格参照, ...用户手动补的素材图]，跟 slidePrompt.ts
  // prompt 文字里 Image 1/Image 2 的编号严格对应；样张自己生成时数组是空的
  ipcMain.handle('generate-slide-image', async (event, prompt: string, requestId: string, inputImagesB64: string[] = []): Promise<string> => {
    try {
      const settings = getSettings()
      const config = settings.imageProvider
      if (!config?.apiKey) {
        throw new Error('生成 PPT 需要图片生成服务，请先在设置中配置图片生成的 API Key')
      }
      return await generateImage(
        config.apiKey,
        config.model || 'gpt-image-2',
        config.baseUrl,
        prompt,
        config.resolution ?? '2k',
        inputImagesB64,
        (partialB64, index) => event.sender.send('slide-image-progress', requestId, partialB64, index)
      )
    } catch (error) {
      throw new Error(describeError(error))
    }
  })

  // 用默认档（2K/medium，跟 skill 的默认档一致）测一张图，验证 Key/网络/模型权限是否可用，不用先保存设置
  ipcMain.handle('test-image-generation', async (_event, apiKey: string, model: string, baseUrl?: string): Promise<string> => {
    try {
      if (!apiKey.trim()) {
        throw new Error('请先填写 API Key')
      }
      return await generateImage(apiKey, model || 'gpt-image-2', baseUrl, '一个简单的白色背景上的灰色圆形', '2k', [])
    } catch (error) {
      throw new Error(describeError(error))
    }
  })
}
