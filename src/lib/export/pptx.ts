import PptxGenJS from 'pptxgenjs'

// 跟参考 skill 的 assemble_ppt.py（compress_image_if_needed）保持一致：
// 单张幻灯片图片超过 2MB 就压缩，避免 4K 档生成的 PNG 把最终 pptx 文件撑得异常大。
// skill 的压缩策略：先在 JPEG 质量 95→20（步进 5）之间找一个足够小的质量；
// 如果质量压到 20 还不够小，再在缩放 0.9→0.3（步进 0.1，固定质量 85）之间找一个足够小的尺寸。
const MAX_SIZE_BYTES = 2 * 1024 * 1024
const QUALITY_START = 0.95
const QUALITY_MIN = 0.2
const QUALITY_STEP = 0.05
const SCALE_START = 0.9
const SCALE_MIN = 0.3
const SCALE_STEP = 0.1
const SCALE_QUALITY = 0.85

function base64ByteLength(base64: string): number {
  // 不含 data URL 前缀的纯 base64 字符串，每 4 个字符编码 3 个字节，末尾的 '=' 填充要扣掉
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0
  return Math.floor((base64.length * 3) / 4) - padding
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('图片解码失败'))
    img.src = dataUrl
  })
}

// canvas.toDataURL 是同步 API，但为了跟 loadImage 的 Promise 风格一致，这里也包一层
function canvasToJpegDataUrl(canvas: HTMLCanvasElement, quality: number): string {
  return canvas.toDataURL('image/jpeg', quality)
}

function dataUrlToBase64(dataUrl: string): string {
  const comma = dataUrl.indexOf(',')
  return comma === -1 ? dataUrl : dataUrl.slice(comma + 1)
}

// 把一张 PNG base64 压缩到 2MB 以内；不需要压缩就原样返回（保留 PNG，不强制转成 JPEG 损失质量）
async function compressImageIfNeeded(pngBase64: string): Promise<{ base64: string; format: 'png' | 'jpeg' }> {
  if (base64ByteLength(pngBase64) <= MAX_SIZE_BYTES) {
    return { base64: pngBase64, format: 'png' }
  }

  const img = await loadImage(`data:image/png;base64,${pngBase64}`)
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  if (!ctx) return { base64: pngBase64, format: 'png' }

  // 第一轮：固定原始尺寸，从高质量往下试 JPEG 压缩
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  // JPEG 不支持透明通道，先铺白底再画图，跟 skill 里 RGBA→RGB 贴白底再存 JPEG 是同一个道理
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0)

  for (let quality = QUALITY_START; quality > QUALITY_MIN; quality -= QUALITY_STEP) {
    const dataUrl = canvasToJpegDataUrl(canvas, quality)
    const base64 = dataUrlToBase64(dataUrl)
    if (base64ByteLength(base64) <= MAX_SIZE_BYTES) {
      return { base64, format: 'jpeg' }
    }
  }

  // 第二轮：质量压到最低还不够小，改缩小尺寸（固定质量 85，跟 skill 一致）
  for (let scale = SCALE_START; scale > SCALE_MIN; scale -= SCALE_STEP) {
    const scaledCanvas = document.createElement('canvas')
    scaledCanvas.width = Math.round(img.naturalWidth * scale)
    scaledCanvas.height = Math.round(img.naturalHeight * scale)
    const scaledCtx = scaledCanvas.getContext('2d')
    if (!scaledCtx) break
    scaledCtx.fillStyle = '#ffffff'
    scaledCtx.fillRect(0, 0, scaledCanvas.width, scaledCanvas.height)
    scaledCtx.drawImage(img, 0, 0, scaledCanvas.width, scaledCanvas.height)

    const dataUrl = canvasToJpegDataUrl(scaledCanvas, SCALE_QUALITY)
    const base64 = dataUrlToBase64(dataUrl)
    if (base64ByteLength(base64) <= MAX_SIZE_BYTES) {
      return { base64, format: 'jpeg' }
    }
  }

  // 实在压不下去了（比如画面本身极其复杂），返回质量压到最低时的结果，好过完全不压
  const fallbackDataUrl = canvasToJpegDataUrl(canvas, QUALITY_MIN)
  return { base64: dataUrlToBase64(fallbackDataUrl), format: 'jpeg' }
}

// notes[i] 跟 images[i] 按下标对应——跟参考 skill 的做法一致（speech.md 用 "Slide N" 标题映射回页码，
// assemble_ppt.py 读到后写进对应页的 PPT 备注栏），这里直接用数组下标对应，不需要中间的 markdown 文件形式
export async function buildPptxArrayBuffer(images: string[], notes?: (string | undefined)[]): Promise<ArrayBuffer> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE'

  for (let i = 0; i < images.length; i++) {
    const { base64: finalBase64, format } = await compressImageIfNeeded(images[i])
    const slide = pptx.addSlide()
    slide.background = { data: `image/${format};base64,${finalBase64}` }
    const note = notes?.[i]
    if (note) slide.addNotes(note)
  }

  const buffer = await pptx.write({ outputType: 'arraybuffer' })
  return buffer as ArrayBuffer
}
