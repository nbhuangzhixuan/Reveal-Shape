import type { Plan, TreeNode } from '@shared/index'
import { buildNarrative } from '../narrative'

function appendNode(lines: string[], node: TreeNode, depth: number, index: number, sequential: boolean): void {
  const indent = '  '.repeat(depth)
  const marker = sequential ? `${index + 1}.` : '-'
  const desc = node.description ? ` — ${node.description}` : ''
  lines.push(`${indent}${marker} ${node.title}${desc}`)
  node.children.forEach((child, i) => appendNode(lines, child, depth + 1, i, !!node.childrenSequential))
}

export function buildMarkdown(plan: Plan): string {
  const lines: string[] = []
  lines.push(`# ${plan.root?.title ?? plan.task}`)
  lines.push('')

  if (plan.restructure?.draft) {
    lines.push(buildNarrative(plan.restructure.draft))
    lines.push('')
  }

  lines.push('---')
  lines.push('')

  plan.root?.children.forEach((child, i) => appendNode(lines, child, 0, i, !!plan.root!.childrenSequential))

  return lines.join('\n')
}
