import { NodeResizer, type Node, type NodeProps } from '@xyflow/react'
import type { ArchitectureFlowData } from '@/lib/flow-mappers'
import { cn } from '@/lib/utils'

export function TextNode({ data, selected }: NodeProps<Node<ArchitectureFlowData>>) {
  const node = data.architectureNode
  return (
    <div
      className={cn(
        'flex h-full w-full items-center px-2 text-sm text-[var(--color-ink)]',
        selected && 'rounded outline outline-1 outline-[var(--color-accent)]',
      )}
      style={{ color: node.color }}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={80}
        minHeight={32}
        lineClassName="!border-[var(--color-accent)]"
        handleClassName="!h-1.5 !w-1.5 !border-[var(--color-accent)] !bg-white"
      />
      {node.name}
    </div>
  )
}
