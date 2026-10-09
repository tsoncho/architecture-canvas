import { Handle, Position } from '@xyflow/react'
import { cn } from '@/lib/utils'

const SIDES = [
  { id: 'top', position: Position.Top },
  { id: 'right', position: Position.Right },
  { id: 'bottom', position: Position.Bottom },
  { id: 'left', position: Position.Left },
] as const

const handleClass = cn(
  '!h-2.5 !w-2.5 !rounded-full !border-2 !border-[var(--color-border)] !bg-[var(--color-surface)]',
  'opacity-60 transition-all group-hover/node:!opacity-100',
  'hover:!scale-125 hover:!border-[var(--color-accent)] hover:!bg-[var(--color-accent)]',
)

/**
 * Ports on all four sides. Combined with ConnectionMode.Loose, any port can
 * start or end a link — so one rectangle can take many connections.
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
