import type { SlideSpec } from './slideOutline'
import { BUILTIN_SLIDE_STYLES } from '../styleLibrary'

// 兜底风格——理论上用户在选风格这一步之前不会走到生图，这里只是防止 selectedStyle 意外为空时崩掉；
// 直接取内置风格库的第一个（清爽专业风），不再自己写一份简化版风格描述
const DEFAULT_STYLE_BRIEF: Record<string, unknown> = BUILTIN_SLIDE_STYLES[0]?.brief ?? {}

// 每种页面角色给出通用说明（不是版式候选清单）——content 页的具体版式已经在准备大纲阶段
// 提前决定好（见 spec.layout），这里只覆盖没有走版式决策的页面角色，以及 spec.layout 意外缺失时的兜底
const LAYOUT_GUIDANCE: Record<SlideSpec['kind'], string> = {
  cover: '大标题作为全页视觉主导，配一个跟主题相关的视觉隐喻或结构图形，大量留白，不堆砌内容。',
  section: '标题突出、结构简洁，作为进入下一部分内容前的过渡页；可以配一个跟这部分主题相关的视觉隐喻，避免跟其它章节分隔页长得一模一样。',
  toc: '把每一条目录项列成清晰的列表，一行一条，可配简单的编号或图标，排版工整易读，不需要复杂图形。',
  // 兜底候选清单——只有 spec.layout 缺失时才会用到这份（正常流程下 content 页都应该已经有 spec.layout）
  content: `候选版式（根据下面"必须逐字呈现"的要点实际内容语义挑一种最贴切的，不要不假思索地都用同一种）：
- 并排卡片：适合几条彼此独立、并列、没有先后关系的要点
- 编号流程/路径图：适合有先后顺序、步骤或阶段关系的要点
- 对比表格或双栏对比：适合要点之间在做对比、权衡取舍
- 时间线：适合要点带有时间维度或发展阶段
- 数据看板卡片：适合要点包含具体数据、指标、百分比
- 简化架构图/流程图：适合要点描述的是结构、模块或步骤间的关系
呈现要点的视觉单元数量（卡片/节点/时间点/表格行等）必须跟要点数量完全一致，不多不少，不能为了视觉对称而增删占位元素。`,
  closing: '收尾/总结页。作为整份 PPT 的收束，把下面"必须逐字呈现"的几条（各部分标题）汇总呈现，视觉上要跟封面页呼应但更简洁克制，传达"讲完了、这是整体回顾"的感觉，不要只是把目录页复制一遍。'
}

function formatBlock(title: string, body: string | string[] | Record<string, unknown> | undefined | null): string {
  if (!body || (Array.isArray(body) && body.length === 0)) return ''
  const content = Array.isArray(body)
    ? body.map((line) => `- ${line}`).join('\n')
    : typeof body === 'string'
      ? body
      // 风格 brief 是一整份 JSON（跟参考 skill 的 prepare_slide_prompts.py 里 _format_block 对结构化字段的
      // 处理方式一样），直接原样序列化塞进 prompt，不转述、不精简，保留色值和版式规则的具体程度
      : JSON.stringify(body, null, 2)
  return `## ${title}\n${content}`
}

// 描述这次请求实际会传给生图接口的每一张输入图，顺序必须跟真正传给接口的图片数组顺序完全一致——
// 下面 formatBlock('输入图片', ...) 是按这个顺序编号的（Image 1/Image 2/...），编号和实际传的图片
// 数组下标要对得上，模型才能通过文字描述知道"第几张图是什么角色"
export type PromptImageRef =
  | { role: 'style-reference' }
  | { role: 'required-asset'; label: string; caption?: string }

export function buildSlideImagePrompt(
  spec: SlideSpec,
  styleBrief: Record<string, unknown> = DEFAULT_STYLE_BRIEF,
  feedback?: string,
  imageRefs: PromptImageRef[] = []
): string {
  // 跟参考 skill 的 _build_prompt 保持一致：Text 区块把 title 和 key_points 分成两个命名字段传给模型，
  // 不是拼成一个未命名的列表——标题在画面上通常是更大更突出的视觉主导，要点是列表/卡片内容，
  // 混在一起会让模型只能靠"大概率第一条是标题"这种隐含猜测去区分，容易影响版式判断
  const textFields: Record<string, string | string[]> = {}
  if (spec.title) textFields['标题'] = spec.title
  if (spec.keyPoints.length > 0) textFields['要点'] = spec.keyPoints

  const sequentialNote = spec.kind === 'content' && spec.sequential
    ? '上面"要点"里的几条内容彼此是有先后顺序的，请按给出的顺序编号呈现，体现出先后关系。'
    : ''

  const sectionNumberNote = spec.sectionNumber
    ? `这一页的章节编号是「${spec.sectionNumber}」。如果画面上要显示章节编号/序号，必须使用这个数字，禁止自己另外编号或猜测编号；如果这页不需要显示编号也可以不显示，但不能显示成别的数字。`
    : '这一页没有章节编号，不要自己编造或显示任何编号/页码。'

  // 跟参考 skill 的 _format_input_images 保持一致：每张随请求实际传入的图片都要按顺序编号、
  // 写清楚角色，不能只把图片传过去让模型自己猜第几张是什么。角色分两种：
  // - style-reference：已批准的样张，只学配色/字体气质/密度/质感，不照抄具体版式
  //   （对应 skill 的 "Style Reference Rule"）
  // - required-asset：用户手动补的图（比如截图/示意图），是必须原样保留内容的输入图，
  //   不是让模型照着重新画一张类似的（对应 skill 的 user-supplied-assets.md 和
  //   "Input Image Handling Rules"："do not redraw, replace, relabel, or invent a similar figure"）
  const inputImagesText = imageRefs.length > 0
    ? imageRefs
        .map((ref, i) => {
          const n = i + 1
          return ref.role === 'style-reference'
            ? `- Image ${n}：已批准的样张图片，作为这份 PPT 的风格参照；只匹配它的配色、字体气质、排版密度、质感和整体视觉调性，不要照抄它的具体版式布局，除非这一页的"页面角色"明确要求跟样张相同的版式`
            : `- Image ${n}：用户提供的真实素材，对应要点「${ref.label}」；这是必须原样保留内容的输入图，不是风格参照——请原样把这张图放进画面里合适的位置（可以适当缩放裁切以配合排版，但不能改变图片本身的内容、不能重新画一张类似的图代替，也不能凭空编造这张图里没有的细节）${ref.caption ? `；用户给这张图写的图注是「${ref.caption}」，请把这句图注文字渲染在画面里靠近这张图的位置（比如图片下方或旁边的小字说明），逐字准确呈现，不要改写或省略` : ''}`
        })
        .join('\n')
    : ''

  const hasRequiredAsset = imageRefs.some((ref) => ref.role === 'required-asset')

  const blocks = [
    '# 幻灯片图片生成任务',
    formatBlock('画布', [
      '16:9 横版完整演示文稿幻灯片图片',
      '图片本身就是最终排好版的一整页 PPT，不要留白边框、不要额外的装饰性画框',
      '语言：中文'
    ]),
    formatBlock('页面角色', LAYOUT_GUIDANCE[spec.kind]),
    // 跟参考 skill 保持一致：版式（layout.composition/layout.intent）在准备大纲阶段就已经决定好，
    // 这里是"执行这个已经定好的版式"，不是"从候选清单里现场挑一个"——只有 content 页会有 spec.layout
    spec.layout
      ? formatBlock('具体版式（已经决定好，请照这个执行，不需要再自己另外挑选版式）', { 呈现方式: spec.layout.composition, 为什么选这个版式: spec.layout.intent })
      : '',
    spec.kind !== 'cover' ? formatBlock('全局主线（帮助理解这一页在整份 PPT 里的位置，不要求呈现在画面上）', spec.deckContext) : '',
    formatBlock('文字（必须在画面里逐字精确呈现，不得改写、简化、增删或编造字词；"标题"和"要点"是两类不同的文字，不要混在一起呈现）', Object.keys(textFields).length > 0 ? textFields : '（这一页没有必须逐字呈现的文字）'),
    formatBlock('补充说明（帮助理解内容、辅助排版设计，可适当精简转写，不要求逐字呈现）', spec.supportingText),
    formatBlock('视觉风格（这是这份 PPT 全篇统一使用的风格规范，请严格遵循其中的色值、版式和禁止事项）', styleBrief),
    // 本次请求实际附带的输入图片说明——按传入顺序编号，跟真正调用生图接口时的图片数组下标一一对应
    inputImagesText ? formatBlock('输入图片', inputImagesText) : '',
    formatBlock('约束', [
      sequentialNote,
      sectionNumberNote,
      '中文文字必须清晰、准确渲染，不得出现乱码、缺笔画或拼接错误的字符',
      '不能出现水印、无关的品牌 logo',
      '整体排版要与"这是同一份 PPT 里的一页"这件事保持一致，字号字体风格统一',
      // 对齐参考 skill 的 "Input Image Handling Rules"
      hasRequiredAsset ? '上面标注为"用户提供的真实素材"的输入图必须原样使用，不允许重新画一张类似的图代替，也不允许省略不用' : ''
    ].filter(Boolean)),
    feedback ? formatBlock('修改反馈（用户对上一版不满意，请针对这个反馈重新生成，其余要求不变）', feedback) : ''
  ]

  return blocks.filter(Boolean).join('\n\n')
}
