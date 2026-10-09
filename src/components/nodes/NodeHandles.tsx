import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'

const SIDES = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
] as const

const handleClass = cn(
  '!h-2 !w-2 !rounded-full !border-2 !border-[var(--color-border)] !bg-[var(--color-surface)]',
  '!opacity-0 transition-all duration-150',
  'group-hover/node:!opacity-80 group-hover/node:!scale-100',
  'hover:!opacity-100 hover:!scale-125 hover:!border-[var(--color-accent)] hover:!bg-[var(--color-accent)]',
)

/**
 * Four side ports. Loose connection mode lets any port start or finish a link.
 * Handles stay hidden until the node is hovered so the diagram stays calm.
 */
export function NodeHandles() {
  return (
    <>
      {SIDES.map(({ id, position }) => (
        <Handle
          key={id}
          id={id}
          type="source"
          position={position}
          className={handleClass}
          isConnectable
        />
      ))}
    </>
  )
}
