import { type Node, type NodeProps } from '@xyflow/react'
import {
  AppWindow,
  Cloud,
  Cpu,
  Database,
  Globe,
  Layers,
  Server,
  User,
  Workflow,
} from 'lucide-react'
import type { NodeType } from '@/types'
import type { ArchitectureFlowData } from '@/lib/flow-mappers'
import { NodeHandles } from '@/components/nodes/NodeHandles'
import { cn } from '@/lib/utils'

const ICONS: Record<Exclude<NodeType, 'group' | 'text'>, typeof AppWindow> = {
  application: AppWindow,
  service: Layers,
  database: Database,
  api: Globe,
  server: Server,
  queue: Workflow,
  external: Cloud,
  user: User,
}

function NodeIcon({ type }: { type: NodeType }) {
  if (type === 'group' || type === 'text') return null
  const Icon = ICONS[type] ?? Cpu
  return <Icon className="h-4 w-4 shrink-0 opacity-70" aria-hidden />
}

export function ArchitectureNode({ data, selected }: NodeProps<Node<ArchitectureFlowData>>) {
  const node = data.architectureNode
  return (
    <div
      className={cn(
        'group/node flex h-full min-h-[72px] min-w-[160px] flex-col overflow-visible rounded-md border bg-[var(--color-surface)] text-sm shadow-none',
        selected
          ? 'border-[var(--color-accent)] ring-1 ring-[var(--color-accent)]'
          : 'border-[var(--color-border)]',
      )}
    >
      <div className="h-1 w-full shrink-0 rounded-t-[5px]" style={{ backgroundColor: node.color }} />
      <div className="flex flex-1 flex-col gap-1 overflow-hidden px-3 py-2">
        <div className="flex items-center gap-2">
          <NodeIcon type={node.type} />
          <span className="truncate font-medium leading-tight">{node.name}</span>
        </div>
        {node.technology ? (
          <span className="truncate text-xs text-[var(--color-muted)]">{node.technology}</span>
        ) : null}
      </div>
      <NodeHandles />
    </div>
  )
}
