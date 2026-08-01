import type { Plan, SlideSpecShape, TreeNode } from '@shared/index'
import { buildNarrative } from '../narrative'
import { FIVE_W_TWO_H_LABELS, FIVE_W_TWO_H_ORDER } from '../../components/understanding/fiveWTwoH'

// SlideSpec 跟 shared 里的 SlideSpecShape 是同一份形状——那边单独定义是为了让 PptxExportSession（持久化用）
// 能引用它而不必让 types 反向依赖 lib，这里直接复用，避免同一个结构写两份定义
export type SlideSpec = SlideSpecShape
export type SlideKind = SlideSpec['kind']

// 跟 skill 的 deck_context.source_summary 一样是"brief source-wide summary"，不是整篇原文——
// 用户上传的参考材料可能是几千字的长文章，原样塞进每一页的 prompt 会稀释掉真正重要的内容
// （页面角色、必须逐字呈现的文字），这里截断成一段摘要长度
const REFERENCE_TEXT_EXCERPT_LENGTH = 300

export function buildBackgroundText(plan: Plan): string {
  const parts: string[] = []

  const draft = plan.understanding?.draft
  if (draft) {
    const fiveWTwoHText = FIVE_W_TWO_H_ORDER
      .filter((key) => draft[key]?.value)
      .map((key) => `${FIVE_W_TWO_H_LABELS[key].hint}：${draft[key].value}`)
      .join('；')
    if (fiveWTwoHText) parts.push(fiveWTwoHText)
  }

  if (plan.restructure?.draft) parts.push(buildNarrative(plan.restructure.draft))

  // 参考 skill 的做法（deck_context.source_summary 覆盖"来源材料摘要"）——理解阶段的 5W2H 只是
  // 结构化提炼，会丢掉原文里的具体事实、数据、专有名词，这里把原文本身的一段摘录也带进主线，
  // 让每一页在生图时能看到一点原文的具体细节，不是只有结构化后的粗粒度信息
  if (plan.referenceText) {
    const trimmed = plan.referenceText.trim()
    const excerpt = trimmed.length > REFERENCE_TEXT_EXCERPT_LENGTH
      ? `${trimmed.slice(0, REFERENCE_TEXT_EXCERPT_LENGTH)}...`
      : trimmed
    parts.push(`参考材料摘录：${excerpt}`)
  }

  return parts.join('\n\n')
}

function contentLine(node: TreeNode, index: number, sequential: boolean): string {
  const marker = sequential ? `${index + 1}. ` : ''
  return node.description ? `${marker}${node.title} — ${node.description}` : `${marker}${node.title}`
}

// 树最深能拆到第 3 层（根 → 分支 → 子节点 → 孙节点），但内容页只列到子节点标题（第 2 层）。
// 如果某个子节点自己还有第 3 层孙节点，这部分内容不新增页面（不然页数会随拆解深度不可控地膨胀），
// 而是并进 supportingText，按"子节点：孙节点1、孙节点2"的形式带给模型，避免第 3 层内容被直接丢弃
function grandchildrenLine(node: TreeNode): string | undefined {
  if (node.children.length === 0) return undefined
  return `${node.title}的下一层细分：${node.children.map((c) => c.title).join('、')}`
}

// 收集一条"要点"（第 2 层子节点）自己以及它整棵子树（第 3 层孙节点，理论上还可以更深）里
// 挂着的所有图片——不管图具体挂在哪一层，最终都要归到这条要点名下，因为一页 PPT 的"要点"
// 只列到第 2 层，图不能凭空对应到一个画面上根本没有单独出现的第 3 层标题。
// 之前的实现只看了直接子节点，孙节点上的图会被直接丢掉，这里改成整棵子树都收
function collectImagesForKeyPoint(node: TreeNode, keyPointLabel: string): { label: string; imageDataUrl: string; caption?: string }[] {
  const images: { label: string; imageDataUrl: string; caption?: string }[] = []
  if (node.imageDataUrl) images.push({ label: keyPointLabel, imageDataUrl: node.imageDataUrl, caption: node.imageCaption })
  for (const child of node.children) {
    images.push(...collectImagesForKeyPoint(child, keyPointLabel))
  }
  return images
}

// 一个分支下的子节点默认全部合并成一页 PPT，但用户可以在导出前把某个要点标成"从这里另开一页"
// （TreeNode.pageBreakBefore），本函数按这个标记把子节点数组切成一组一组，每一组对应最终的一页。
// 标记挂在子节点自己身上而不是父节点，好处是删除/新增兄弟节点时不需要额外维护"第几个后面要分页"
// 这种脆弱的位置引用——直接看这批子节点自己带的标记即可
function splitChildrenIntoPages(children: TreeNode[]): TreeNode[][] {
  const groups: TreeNode[][] = []
  for (const child of children) {
    if (child.pageBreakBefore || groups.length === 0) {
      groups.push([child])
    } else {
      groups[groups.length - 1].push(child)
    }
  }
  return groups
}

export function buildSlideOutline(plan: Plan): SlideSpec[] {
  const root = plan.root
  if (!root) return []

  const slides: SlideSpec[] = []
  // 除封面页外，其余每一页都带上这份全局主线，帮模型知道自己在整份 PPT 里的位置，不要求逐字呈现
  const deckContext = buildBackgroundText(plan) || undefined

  slides.push({
    kind: 'cover',
    title: root.title,
    keyPoints: [],
    supportingText: deckContext
  })

  if (root.children.length > 0) {
    slides.push({
      kind: 'toc',
      title: '目录',
      keyPoints: root.children.map((c) => c.title),
      deckContext
    })
  }

  root.children.forEach((branch: TreeNode, index) => {
    const sectionNumber = String(index + 1).padStart(2, '0')

    slides.push({
      kind: 'section',
      title: branch.title,
      keyPoints: [],
      supportingText: branch.description,
      sectionNumber,
      deckContext,
      branchNodeId: branch.id
    })

    // 默认整个分支的子节点合并成一页；用户在导出前可以把某个要点标成"从这里另开一页"
    // （TreeNode.pageBreakBefore），比如某条要点是重点，想单独占一页突出讲
    const pageGroups = splitChildrenIntoPages(branch.children)

    pageGroups.forEach((group) => {
      const descriptionLines = group
        .filter((c) => c.description)
        .map((c) => `${c.title}：${c.description}`)
      const grandchildrenLines = group
        .map(grandchildrenLine)
        .filter((line): line is string => !!line)
      const supportingText = [...descriptionLines, ...grandchildrenLines].join('；') || undefined

      // 子节点自己、或它下面第 3 层孙节点上如果补了图（呈现阶段手动上传的截图/示意图），
      // 这一页就带着这些图去生成，图归到对应的子节点（要点）标题名下——不管图具体是挂在
      // 子节点还是更深的孙节点上，页面上能看到的"要点"只到子节点这一层
      const requiredImages = group.flatMap((c) => collectImagesForKeyPoint(c, c.title))

      slides.push({
        kind: 'content',
        title: branch.title,
        keyPoints: group.map((c) => c.title),
        keyPointNodeIds: group.map((c) => c.id),
        supportingText,
        // 有先后顺序是整个分支子节点的属性，被拆开后每一页各自的要点仍然保持这个先后关系；
        // 注意每页内部编号是从 1 开始局部编号的，不跨页延续绝对步骤号（比如一个 4 步流程从
        // 第 2 步后拆页，第二页会显示"1、2"而不是"3、4"）——这是当前的已知限制，不是 bug
        sequential: !!branch.childrenSequential,
        sectionNumber,
        deckContext,
        requiredImages: requiredImages.length > 0 ? requiredImages : undefined,
        branchNodeId: branch.id
      })
    })
  })

  // 收尾页——参考 skill 推荐结构里固定要有的 "Summary / recommendation / closing"，
  // 把各分支标题列一遍当总结要点，不是简单复述目录，而是"这些都讲完了"的收束；
  // 跟目录页一样只在确实有分支时才生成——没有分支时这一页会是"标题是总结、但一条要点都没有"的空页
  if (root.children.length > 0) {
    slides.push({
      kind: 'closing',
      title: '总结',
      keyPoints: root.children.map((c) => c.title),
      supportingText: deckContext
    })
  }

  return slides
}

// 挑一页当生成样张的对象——优先选内容页（并排卡片/流程图这类真正有版式复杂度的页面），
// 而不是信息密度很低的封面/目录/章节页，因为样张的目的是验证风格在真实内容页上的效果，
// 参考 skill 原文："Prefer a representative content slide over the cover when possible"
export function pickSampleIndex(slides: SlideSpec[]): number {
  const contentIndex = slides.findIndex((s) => s.kind === 'content')
  if (contentIndex !== -1) return contentIndex
  const nonCoverIndex = slides.findIndex((s) => s.kind !== 'cover')
  return nonCoverIndex !== -1 ? nonCoverIndex : 0
}

// 对齐参考 skill 的质检清单（project-assembly-and-reporting.md）里"Slide content matches the outline"
// 这一条——跟"文字有没有逐字出现"是两件不同的事：这条是看画面呈现的内容/结构有没有对应上
// 这一页在大纲里该扮演的角色（比如"有先后顺序"的要点有没有体现出顺序，版式决策要求的呈现方式
// 有没有被执行）。返回一句话描述给质检模型做判断依据；封面/目录这类没有实质版式要求的页面返回空
export function buildOutlineContextForQa(spec: SlideSpec): string | undefined {
  if (spec.kind !== 'content') return undefined
  const parts: string[] = []
  if (spec.layout) {
    parts.push(`这一页应该呈现成：${spec.layout.composition}`)
  }
  if (spec.sequential) {
    parts.push('上面的要点彼此有先后顺序，画面应该体现出这种顺序（比如编号、箭头、时间线等），不能画成互不关联的并列卡片')
  }
  // 对齐参考 skill 的做法（user-supplied-assets.md）："ask the model to preserve the supplied figure's
  // data... and pay special attention to whether required figures were used correctly"——
  // 用户补的图是必须原样保留内容的输入图，质检要单独确认这些图确实被用上了、没有被模型自己另画一张代替
  if (spec.requiredImages && spec.requiredImages.length > 0) {
    parts.push(`这一页附带了 ${spec.requiredImages.length} 张用户提供的图片（对应：${spec.requiredImages.map((i) => i.label).join('、')}），必须检查这些图片是否原样出现在画面里，而不是被模型重新画了一张类似的图代替`)
  }
  return parts.length > 0 ? parts.join('；') : undefined
}
