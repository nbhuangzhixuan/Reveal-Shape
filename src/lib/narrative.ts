import type { RestructureDraft } from '@shared/index'

// AB+SCQA 本身就是按讲故事的顺序设计的字段，直接顺序拼起来读一遍就是完整的叙述，不需要额外调 AI 生成
export function buildNarrative(draft: RestructureDraft): string {
  return `背景是：${draft.situation}但${draft.complication}，问题就变成了：${draft.question}\n\n答案是：${draft.answer}——这就是核心结论「${draft.theme}」。\n\n这段话讲给「${draft.audience}」听，希望他们听完能${draft.behavior}；听完大概率会追问：${draft.audienceQuestion}`
}
