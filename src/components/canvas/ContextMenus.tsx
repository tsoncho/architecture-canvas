import { useEffect } from 'react'
import { cn } from '@/lib/utils'

export type ContextMenuState = {
  open: boolean
  x: number
  y: number
  nodeId?: string
  edgeId?: string
}

export const initialContextMenu: ContextMenuState = {
  open: false,
  x: 0,
  y: 0,
}

type CanvasContextMenuProps = {
  menu: ContextMenuState
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
  onDuplicate?: () => void
}

export function CanvasContextMenu({
  menu,
  onClose,
  onEdit,
  onDelete,
  onDuplicate,
}: CanvasContextMenuProps) {
  useEffect(() => {
    if (!menu.open) return
    const close = () => onClose()
    window.addEventListener('click', close)
    window.addEventListener('scroll', close, true)
    return () => {
      window.removeEventListener('click', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [menu.open, onClose])

  if (!menu.open) return null

  return (
    <div
      className="fixed z-50 min-w-[140px] rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] py-1 text-sm shadow-sm dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]"
      style={{ left: menu.x, top: menu.y }}
      onClick={(e) => e.stopPropagation()}
      role="menu"
    >
      <button
        type="button"
        className={cn(
          'block w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5',
        )}
        onClick={() => {
          onEdit()
          onClose()
        }}
      >
        Edit
      </button>
      {onDuplicate ? (
        <button
          type="button"
          className="block w-full px-3 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
          onClick={() => {
            onDuplicate()
            onClose()
          }}
        >
          Duplicate
        </button>
      ) : null}
      <button
        type="button"
        className="block w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
        onClick={() => {
          onDelete()
          onClose()
        }}
      >
        Delete
      </button>
    </div>
  )
}
