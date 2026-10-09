import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { ArchitectureFlowData } from '@/lib/flow-mappers'
import { cn } from '@/lib/utils'

export function GroupNode({ data, selected }: NodeProps<Node<ArchitectureFlowData>>) {
  const node = data.architectureNode
  return (
    <div
      className={cn(
        'relative h-full w-full rounded-lg border-2 border-dashed bg-transparent',
        selected ? 'border-[var(--color-accent)]' : 'border-[var(--color-muted)]/50',
      )}
    >
      <div
        className="absolute left-3 top-2 text-xs font-medium text-[var(--color-muted)]"
        style={{ color: node.color }}
      >
        {node.name}
      </div>
      <Handle type="target" position={Position.Top} className="!opacity-0" />
      <Handle type="source" position={Position.Bottom} className="!opacity-0" />
    </div>
  )
}
