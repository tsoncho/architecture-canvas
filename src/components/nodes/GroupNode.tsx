import { type Node, type NodeProps } from '@xyflow/react'
import type { ArchitectureFlowData } from '@/lib/flow-mappers'
import { NodeHandles } from '@/components/nodes/NodeHandles'
import { cn } from '@/lib/utils'

export function GroupNode({ data, selected }: NodeProps<Node<ArchitectureFlowData>>) {
  const node = data.architectureNode
  return (
    <div
      className={cn(
        'group/node relative h-full w-full rounded-lg border-2 border-dashed bg-transparent',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-muted)]/50',
      )}
    >
      <div
        className="absolute left-3 top-2 text-xs font-medium text-[var(--color-muted)]"
        style={{ color: node.color }}
      >
        {node.name}
      </div>
      <NodeHandles />
    </div>
  )
}
