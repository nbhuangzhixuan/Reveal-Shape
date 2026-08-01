import type { AnsweredQuestion, FiveWTwoHDraft, FiveWTwoHKey, RestructureDraft, UnderstandingSynthesis } from '@shared/index'
import type { TreePathNode } from './types'

const FIVE_W_TWO_H_ORDER: FiveWTwoHKey[] = ['what', 'why', 'who', 'when', 'where', 'how', 'howMuch']

const FIVE_W_TWO_H_DESCRIPTIONS: Record<FiveWTwoHKey, string> = {
  what: 'What（具体要做成什么、交付物是什么）',
  why: 'Why（为什么做，达成什么效果算成功）',
  who: 'Who（谁参与——只有自己，还是需要别人配合/审批）',
  when: 'When（时间节点，截止时间或需要看到进展的时间）',
  where: 'Where（在什么场景/环境下进行）',
  how: 'How（有没有已知的方法、限制或偏好做法）',
  howMuch: 'How much（预算/资源/规模上限——时间、金钱、人力投入的量级）'
}

function formatFiveWTwoHDraft(draft: FiveWTwoHDraft): string {
  return FIVE_W_TWO_H_ORDER.map((key) => `- ${FIVE_W_TWO_H_DESCRIPTIONS[key]}：${draft[key].value}`).join('\n')
}

function formatReferenceText(referenceText?: string): string {
  if (!referenceText) return ''
  return `\n\n用户还上传了一份参考材料，内容如下：\n"""\n${referenceText}\n"""\n`
}

export const UNDERSTANDING_SYSTEM_PROMPT =
  '你是一个善于把模糊想法问清楚的规划助手，擅长用 5W2H 框架（What/Why/Who/When/Where/How/How much）快速理清一件事的背景。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

export function buildSelectQuestionsPrompt(task: string, referenceText?: string): string {
  const dimensions = FIVE_W_TWO_H_ORDER.map((key) => `- ${key}: ${FIVE_W_TWO_H_DESCRIPTIONS[key]}`).join('\n')
  return `用户想做的事情是：${task}

5W2H 七个维度分别是：
${dimensions}
${formatReferenceText(referenceText)}
请判断这句话（以及参考材料，如果有的话）里，哪几个维度还是看不出来、真正需要问用户（最多挑 4 个，挑得越少越好，只挑参考材料没覆盖、且不问清楚会影响后续规划的维度）。如果已经足够清楚、七个维度都能大致判断，就返回空数组。

对每个需要问的维度，写一句自然、口语化的中文问题，不要出现"What/Why"这样的英文术语。

严格按照以下 JSON 格式返回，不要添加其他文字，不要用 markdown 代码块包裹：
[
  {"key": "when", "question": "这件事最重要的截止时间是什么时候？"}
]`
}

export function buildSynthesizePrompt(task: string, answered: AnsweredQuestion[], referenceText?: string): string {
  const qa = answered.length > 0
    ? answered
        .map((a) => `- ${a.question}\n  ${a.answer !== null ? `用户回答：${a.answer}` : '（用户跳过了这题，请你根据任务本身合理推断）'}`)
        .join('\n')
    : '（用户没有被追加提问，请你根据任务本身直接推断全部七项）'

  return `用户想做的事情是：${task}
${formatReferenceText(referenceText)}
已经问过用户的问题和回答：
${qa}

请把这件事综合成完整的 5W2H 七项。参考材料里明确写到的内容，直接采用，来源标为 "user"；用户回答过的维度，忠实反映用户的回答，来源标为 "user"；参考材料没提到、用户也跳过或没被问到的维度，才由你根据任务本身合理推断，来源标为 "ai"。

另外再写一段 2-3 句的自然语言整体描述（summary），把这件事是什么、为什么做、谁参与、大概怎么做连贯地说清楚，方便用户一眼判断这是不是他想要的，不要逐项罗列，要像人话一样连起来说。

严格按照以下 JSON 格式返回，不要添加其他文字，不要用 markdown 代码块包裹，summary 和 draft 七个 key 必须齐全：
{
  "summary": "一段连贯的自然语言描述",
  "draft": {
    "what": {"value": "...", "source": "user"},
    "why": {"value": "...", "source": "ai"},
    "who": {"value": "...", "source": "ai"},
    "when": {"value": "...", "source": "user"},
    "where": {"value": "...", "source": "ai"},
    "how": {"value": "...", "source": "ai"},
    "howMuch": {"value": "...", "source": "ai"}
  }
}`
}

export function buildRefineUnderstandingPrompt(task: string, current: UnderstandingSynthesis, feedback: string): string {
  return `用户想做的事情是：${task}

当前的整体描述是：
${current.summary}

当前的 5W2H 草稿是：
${formatFiveWTwoHDraft(current.draft)}

用户的反馈是：${feedback}

请根据反馈重新生成整体描述和完整的 5W2H 七项，被反馈明确指出要改的部分改掉，其余保持合理，两者要互相一致。

严格按照以下 JSON 格式返回，不要添加其他文字，不要用 markdown 代码块包裹，summary 和 draft 七个 key 必须齐全：
{
  "summary": "一段连贯的自然语言描述",
  "draft": {
    "what": {"value": "...", "source": "user"},
    "why": {"value": "...", "source": "ai"},
    "who": {"value": "...", "source": "ai"},
    "when": {"value": "...", "source": "user"},
    "where": {"value": "...", "source": "ai"},
    "how": {"value": "...", "source": "ai"},
    "howMuch": {"value": "...", "source": "ai"}
  }
}`
}

export const RESTRUCTURE_SYSTEM_PROMPT =
  '你是一个善用《结构思考力》方法论（脱胎于麦肯锡金字塔原理）梳理表达逻辑的助手。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

export function buildDeriveRestructurePrompt(task: string, understanding: FiveWTwoHDraft): string {
  return `用户想做的事情是：${task}

已经理清的 5W2H 背景信息：
${formatFiveWTwoHDraft(understanding)}

请用《结构思考力》方法帮用户理清表达逻辑，按以下四步依次推导：

1. AB 法则：先明确"受众"（这件事是做给谁看、为了谁——如果只是用户自己要做的事，没有外部读者，受众可以就写"自己"）和"期望行为"（希望受众/自己完成后达成什么状态、做出什么行动）。
2. SCQA：基于第一步的结论，写一段序言故事——现状（Situation，双方认可的背景）、冲突（Complication，现状里的矛盾或触发点）、核心疑问（Question，冲突自然引出的问题）、初步答案（Answer，对这个疑问的回答）。
3. SAP 原则：把 SCQA 的初步答案打磨成一句主题句，要求简单（Simple，一看就懂）、准确（Accurate，贴合目标）、有价值（Profit，对受众有意义），作为整件事的中心思想。
4. 站在受众的角度：受众听完这句主题，会自然想追问什么？用 5W2H（What/Why/Who/When/Where/How/How much）里最贴切的一个角度来组织这个追问，写成一句自然、口语化的问题，不要出现英文术语。这个追问将用来指导下一步怎么把任务拆解成具体阶段。

严格按照以下 JSON 格式返回，不要添加其他文字，不要用 markdown 代码块包裹：
{
  "audience": "...",
  "behavior": "...",
  "situation": "...",
  "complication": "...",
  "question": "...",
  "answer": "...",
  "theme": "...",
  "audienceQuestion": "..."
}`
}

function formatRestructureDraft(draft: RestructureDraft): string {
  return `- 受众：${draft.audience}
- 期望行为：${draft.behavior}
- 现状：${draft.situation}
- 冲突：${draft.complication}
- 核心疑问：${draft.question}
- 初步答案：${draft.answer}
- 主题：${draft.theme}
- 受众接下来会问：${draft.audienceQuestion}`
}

export function buildRefineRestructurePrompt(task: string, current: RestructureDraft, feedback: string): string {
  return `用户想做的事情是：${task}

当前的推导结果是：
${formatRestructureDraft(current)}

用户的反馈是：${feedback}

请根据反馈重新生成完整的推导结果，被反馈明确指出要改的部分改掉，其余保持合理，八项内容要互相一致（受众/行为决定序言故事的口吻，序言故事的初步答案要能自然打磨出主题，主题要能自然引出受众的追问）。

严格按照以下 JSON 格式返回，不要添加其他文字，不要用 markdown 代码块包裹，八个 key 必须齐全：
{
  "audience": "...",
  "behavior": "...",
  "situation": "...",
  "complication": "...",
  "question": "...",
  "answer": "...",
  "theme": "...",
  "audienceQuestion": "..."
}`
}

export const TREE_SYSTEM_PROMPT =
  '你是一个善用金字塔原理拆解结构的规划专家，既能做"横向 MECE 并列分组"，也能识别"有先后顺序、必须按步骤走"的情况。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

function formatPath(path: TreePathNode[]): string {
  return path.map((n, i) => `${'  '.repeat(i)}${i + 1}. ${n.title}${n.description ? `（${n.description}）` : ''}`).join('\n')
}

const MAX_TREE_DEPTH = 3

export function buildGenerateChildrenPrompt(
  task: string,
  understanding: FiveWTwoHDraft,
  restructure: RestructureDraft,
  path: TreePathNode[],
  feedback?: string
): string {
  const target = path[path.length - 1]
  const parents = path.slice(0, -1)
  const forceLeaf = path.length >= MAX_TREE_DEPTH
  return `用户想做的事情是：${task}

背景信息（5W2H）：
${formatFiveWTwoHDraft(understanding)}

中心思想：${restructure.theme}
受众听完会追问：${restructure.audienceQuestion}

这是一棵自上而下拆解的树，当前的路径是：
${formatPath(path)}

${parents.length === 0 ? '现在要为根节点（主题本身）展开出第一层。' : `现在要为"${target.title}"这个节点展开出它的下一层。`}
${feedback ? `用户对之前展开的内容不满意，反馈是：${feedback}\n` : ''}
请把"${target.title}"拆成 2-4 个子节点，宁少勿多，只挑最重要、缺了就说不清楚的几个。

先判断这几个子节点之间的关系：
- 如果互不依赖、谁先谁后都不影响理解（比如"技术方案"和"运营方案"），按不重不漏（MECE）的原则做并列分组，sequential 填 false
- 如果这几个子节点必须按顺序推进、前一个不做完后一个没法开始或没有意义（比如"文献检索"必须先于"方法分析"），sequential 填 true，并把 title 数组按应该执行的先后顺序排列

每个子节点：
1. title 简短（4-12 字）
2. description 一句话（15-25 字），说明为什么存在、跟父节点是什么关系
3. isLeaf：${forceLeaf
      ? '这已经是最后一层，不管内容看起来够不够细，全部子节点都必须标 true（不再往下拆，避免拆得过深、用户看不过来）。'
      : '如果这个子节点已经具体到用户看了就能直接动手去做，标 true（不再需要往下拆）；如果还需要再拆一层才够具体，标 false'}

严格按照以下 JSON 格式返回，不要添加其他文字，不要用 markdown 代码块包裹：
{
  "sequential": false,
  "children": [
    {"title": "...", "description": "...", "isLeaf": false}
  ]
}`
}

export const SLIDE_STYLE_SYSTEM_PROMPT =
  '你是一个熟悉演示文稿视觉设计的助手，擅长根据内容主题和受众，从给定的风格库里挑出最合适的几个。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

// 单节点改写：给 AI 看全量上下文（任务、5W2H、中心思想、从根到目标节点的完整路径、兄弟节点），
// 但把输出作用域锁死在"目标节点自己的 title/description"这两个字段上——上下文让 AI 改得贴合语境，
// 输出约束让代码端只接受这一个节点的补丁，从机制上杜绝"改一个节点连带改了别的节点"。
// 不返回子节点数组：改写的是节点自身内容，不是重新拆解它的下一层。
export function buildRewriteNodePrompt(
  task: string,
  understanding: FiveWTwoHDraft,
  restructure: RestructureDraft,
  path: TreePathNode[],
  siblings: TreePathNode[],
  feedback: string
): string {
  const target = path[path.length - 1]
  const siblingLines = siblings.length > 0
    ? siblings.map((s) => `- ${s.title}${s.description ? `（${s.description}）` : ''}`).join('\n')
    : '（这是根节点，没有兄弟节点）'
  return `用户想做的事情是：${task}

背景信息（5W2H）：
${formatFiveWTwoHDraft(understanding)}

中心思想：${restructure.theme}
受众听完会追问：${restructure.audienceQuestion}

这是一棵自上而下拆解的树，当前的路径是：
${formatPath(path)}

目标节点「${target.title}」当前的标题和描述：
- 标题：${target.title}
- 描述：${target.description ?? '（没有描述）'}

跟它同一层的兄弟节点（理解层级关系用，不要修改它们）：
${siblingLines}

用户的修改要求是：${feedback}

请只改写目标节点「${target.title}」自己的标题和描述，满足这个修改要求。要求：
1. 只改这一个节点，其他任何节点、包括它的子节点和兄弟节点，一律保持原样，不要动
2. 标题保持简洁（4-12 字，根节点可以是完整的一句话）；描述是一句话（15-25 字），说明它为什么存在、跟父节点是什么关系；拿不准描述怎么改时保持原文
3. 保持整棵树金字塔结构的一致性——改完之后的标题/描述要跟它的父节点、兄弟节点仍然说得通、不重复、不矛盾
4. 如果修改要求跟原内容无关（比如用户只想改别的东西），保持原内容不变

严格按照以下 JSON 格式返回，只返回这一个对象，不要添加其他文字，不要用 markdown 代码块包裹，也不要返回子节点数组：
{
  "title": "改写后的标题",
  "description": "改写后的描述"
}`
}

// 注意：这里不让模型生成风格描述本身，只让它从已有风格库里"选名字 + 写一句推荐理由"——
export function buildSlideStylePrompt(task: string, backgroundText: string, availableStyles: { name: string; scenarios: string[] }[]): string {
  const styleList = availableStyles
    .map((s) => `- ${s.name}：适用于${s.scenarios.join('、')}`)
    .join('\n')

  return `用户要把下面这件事整理成一份 PPT：${task}
${backgroundText ? `\n背景信息：\n${backgroundText}\n` : ''}
下面是可选的风格库（每个风格已经有一份成熟、具体的视觉方案，不需要你重新设计，只需要判断哪几个最适合这份内容）：
${styleList}

请从中选出 3 个最适合这份内容主题、受众和表达目标的风格，按最贴切到次贴切排序，并从中选一个标为推荐。为每个风格写一句话说明为什么适合这份内容（不是复述风格库里的适用场景，要结合这份具体内容说）。

严格按照以下 JSON 格式返回，name 必须完全照抄风格库里的名字，一字不差：
[
  {"name": "风格库里的名字", "reason": "结合这份内容说一句为什么适合", "recommended": true},
  {"name": "风格库里的名字", "reason": "...", "recommended": false},
  {"name": "风格库里的名字", "reason": "...", "recommended": false}
]`
}

export const REVISE_STYLE_SYSTEM_PROMPT =
  '你是一个熟悉演示文稿视觉设计的助手，擅长按用户反馈修改一份视觉风格的 JSON 规范。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

// 对齐参考 skill 的原文做法（docs/outline-style-and-sample.md）："If the user requests changes,
// revise the style description and regenerate"——反馈要真正改到风格规范本身，不是只在这一次生成时
// 临时提一句，这样后面所有页、以及"保存风格"存下来的，才是真的经过调整的那份
export function buildReviseStylePrompt(task: string, currentBrief: Record<string, unknown>, feedback: string): string {
  return `用户要把下面这件事整理成一份 PPT：${task}

当前使用的视觉风格规范（JSON）：
${JSON.stringify(currentBrief, null, 2)}

用户看了用这份规范生成的样张后，反馈是：${feedback}

请按这个反馈修改上面的风格规范，只改反馈明确指出要调整的字段，其余字段原样保留，不要精简、不要删掉没提到的字段，也不要改变 JSON 的整体结构（字段名保持一致）。style_name 字段必须保持原样不变，即使反馈涉及配色/字体等描述性内容的调整，也不要因此改这个名字字段。

严格返回修改后的完整 JSON 对象，不要添加其他文字，不要用 markdown 代码块包裹。`
}

export const GENERATE_NOTES_SYSTEM_PROMPT =
  '你是一个经验丰富的演讲稿撰稿人，擅长站在演讲者本人的视角，把一份 PPT 大纲写成可以直接照着讲的口语化讲稿。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

// 对齐参考 skill 的做法（project-assembly-and-reporting.md 的 Speaker Notes 一节）：
// - 先按内容/受众/目的选一种讲述风格（技术讲解/论文汇报/产品路演/培训工作坊/高管汇报），
//   风格要体现在措辞本身，不是写完之后贴一个标签
// - 站在演讲者视角、面对听众第一人称口吻写，不是"本页介绍了..."这种旁白式转述
// - 先说结论再说细节；按听众该看的顺序解释画面；多举例/对比/"所以呢"，少复述画面文字；结尾给一句过渡到下一页
// - 封面/目录/章节页 1-2 段，普通内容页 2-5 段（大约 150-400 字），信息密度高的页可以更长
export function buildGenerateNotesPrompt(
  task: string,
  backgroundText: string,
  slides: { index: number; kind: string; title: string; keyPoints: string[] }[]
): string {
  const slideList = slides
    .map((s) => `- 第 ${s.index} 页（${s.kind}）「${s.title}」${s.keyPoints.length > 0 ? `：${s.keyPoints.join('、')}` : ''}`)
    .join('\n')

  return `用户要把下面这件事整理成一份 PPT 并配上讲稿：${task}
${backgroundText ? `\n背景信息：\n${backgroundText}\n` : ''}
这份 PPT 的完整大纲（按顺序）：
${slideList}

请先根据内容、受众和场合选一种讲述风格（比如技术讲解、论文/研究汇报、产品路演、培训工作坊、高管汇报），然后给每一页写一段演讲者站在台上、面对听众直接讲的口语化讲稿：

- 用第一人称、面对听众的口吻（"这里我想强调的是..."、"我们先看左边这个结构..."），不要写成"本页介绍了..."这样的旁白转述
- 先说这一页的结论/要点，再展开细节；按听众该看的顺序解释画面上的内容
- 多用例子、对比、"所以这意味着"之类的实际内容，少复述画面上已经写的文字
- 每段结尾（如果自然的话）给一句过渡到下一页的话
- 封面/目录/章节过渡页写 1-2 段；普通内容页写 2-5 段（大约 150-400 字）；信息密度很高的页可以适当更长
- 全篇保持同一种讲述风格，但可以按页面角色调整语气（开场页更偏"引入"，收尾页更偏"行动号召"）
- 用中文写，不要提到这是 AI 生成或推断的

严格按照以下 JSON 格式返回一个数组，覆盖上面列出的每一页，index 必须跟给出的页码对应：
[
  {"index": 1, "notes": "这一页的完整讲稿文本"}
]`
}

export const DECIDE_LAYOUTS_SYSTEM_PROMPT =
  '你是一个熟悉信息图表和 PPT 版式设计的助手，擅长根据内容语义给每一页选一个贴切的版式，并让全篇的版式有变化、不单调。只返回严格的 JSON，不要有其他文字，不要用 markdown 代码块包裹。'

// 对齐参考 skill 的做法（slide-generation-and-subagents.md）："choose a layout that fits its content and
// explain that choice in the layout.intent field"——版式决策要在准备大纲阶段就做完，不能让生图模型自己
// 现场从候选清单里挑；这一步能看到全篇所有内容页，可以有意识地让相邻页版式错开（skill 的 variation_rule：
// "do not repeat the same blueprint on adjacent slides unless the content is part of a deliberate
// repeated sequence"），而不是每一页孤立判断
export function buildDecideLayoutsPrompt(
  task: string,
  slides: { index: number; title: string; keyPoints: string[]; sequential: boolean; keyPointsWithImage?: string[] }[]
): string {
  const slideList = slides
    .map((s) => {
      const imageNote = s.keyPointsWithImage && s.keyPointsWithImage.length > 0
        ? `（其中「${s.keyPointsWithImage.join('、')}」这${s.keyPointsWithImage.length > 1 ? '几条' : '条'}要点自带真实素材图，必须原样放进画面）`
        : ''
      return `- 第 ${s.index} 页「${s.title}」：${s.keyPoints.join('、')}${s.sequential ? '（这几条要点有先后顺序）' : ''}${imageNote}`
    })
    .join('\n')

  return `用户要把下面这件事整理成一份 PPT：${task}

下面是这份 PPT 里所有内容页的标题和要点：
${slideList}

候选版式（不是必须套用的模板，可以在这几种基础上灵活调整具体呈现方式）：
- 并排卡片：适合几条彼此独立、并列、没有先后关系的要点
- 编号流程/路径图：适合有先后顺序、步骤或阶段关系的要点
- 对比表格或双栏对比：适合要点之间在做对比、权衡取舍
- 时间线：适合要点带有时间维度或发展阶段
- 数据看板卡片：适合要点包含具体数据、指标、百分比
- 简化架构图/流程图：适合要点描述的是结构、模块或步骤间的关系

请为每一页选一个最贴切的版式，写清楚具体呈现方式（比如"三张并排卡片，每张卡片顶部一个图标+标题，下方一行说明"），并说明为什么选这个版式。相邻两页尽量不要用同一种版式（除非内容确实是同一种关系的延续），让整份 PPT 看起来有变化，不单调。

如果某一页标注了"某条要点自带真实素材图"，版式设计必须围绕这张图展开，不能当它不存在、平均分配画面：给这条要点分配明显更大的画面空间用来完整展示这张真实图片（比如"左侧大图展示素材图，右侧几张小卡片列其余要点说明"），其余没有图的要点用简洁小卡片处理即可，不要求跟有图的要点占同样大小的空间。

严格按照以下 JSON 格式返回一个数组，覆盖上面列出的每一页，index 必须跟给出的页码对应：
[
  {"index": 1, "composition": "具体呈现方式的描述", "intent": "为什么选这个版式"}
]`
}

/**
 * 模型偶尔会用 ```json 包裹或加前后缀文字，这里做宽松提取。
 */
export function parseJSONArray<T>(raw: string): T[] {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('[')
  const end = candidate.lastIndexOf(']')
  const jsonSlice = start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate

  const parsed = JSON.parse(jsonSlice)
  if (!Array.isArray(parsed)) {
    throw new Error('AI 返回内容不是一个 JSON 数组')
  }
  return parsed as T[]
}

/**
 * parseJSONArray 的对象版：用于 AI 返回单个 JSON 对象（而非数组）的场景。
 */
export function parseJSONObject<T>(raw: string): T {
  const trimmed = raw.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)
  const candidate = fenced ? fenced[1] : trimmed
  const start = candidate.indexOf('{')
  const end = candidate.lastIndexOf('}')
  const jsonSlice = start !== -1 && end !== -1 ? candidate.slice(start, end + 1) : candidate

  const parsed = JSON.parse(jsonSlice)
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error('AI 返回内容不是一个 JSON 对象')
  }
  return parsed as T
}
