import type { FiveWTwoHKey } from '@shared/index'

export const FIVE_W_TWO_H_ORDER: FiveWTwoHKey[] = ['what', 'why', 'who', 'when', 'where', 'how', 'howMuch']

export const FIVE_W_TWO_H_LABELS: Record<FiveWTwoHKey, { short: string; hint: string }> = {
  what: { short: 'What', hint: '做什么' },
  why: { short: 'Why', hint: '为什么' },
  who: { short: 'Who', hint: '谁参与' },
  when: { short: 'When', hint: '什么时候' },
  where: { short: 'Where', hint: '在哪里' },
  how: { short: 'How', hint: '怎么做' },
  howMuch: { short: 'How much', hint: '多少投入' }
}
