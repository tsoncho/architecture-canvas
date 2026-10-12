import { NodeResizer, type Node, type NodeProps } from '@xyflow/react'
import type { ArchitectureFlowData } from '@/lib/flow-mappers'
import { NodeHandles } from '@/components/nodes/NodeHandles'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

export function GroupNode({ id, data }: NodeProps<Node<ArchitectureFlowData>>) {
  const node = data.architectureNode
  const selected = useUiStore((s) => s.selectedIds.includes(id))
  return (
    <div
      className={cn(
        'group/node relative h-full w-full rounded-lg border-2 border-dashed bg-transparent',
        selected
          ? 'border-[var(--color-accent)] ring-2 ring-[var(--color-accent)]/40'
          : 'border-[var(--color-muted)]/50',
      )}
    >
      <NodeResizer
        isVisible={selected}
        minWidth={160}
        minHeight={120}
        lineClassName="!border-[var(--color-accent)]"
        handleClassName="!h-2 !w-2 !border-[var(--color-accent)] !bg-white"
      />
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
