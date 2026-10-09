import { type Node, type NodeProps } from '@xyflow/react'
import type { ArchitectureFlowData } from '@/lib/flow-mappers'
import { cn } from '@/lib/utils'

export function TextNode({ data, selected }: NodeProps<Node<ArchitectureFlowData>>) {
  const node = data.architectureNode
  return (
    <div
      className={cn(
        'flex h-full w-full items-center px-2 text-sm text-[var(--color-ink)] dark:text-[var(--color-ink-dark)]',
        selected && 'rounded outline outline-1 outline-[var(--color-accent)]',
      )}
      style={{ color: node.color }}
    >
      {node.name}
    </div>
  )
}
