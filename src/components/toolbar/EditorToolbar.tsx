import { Maximize2, Plus, Redo2, Undo2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ADDABLE_NODE_TYPES, NODE_CATALOG } from '@/lib/node-types'
import { dispatchFitView, dispatchNodeType } from '@/components/canvas/ArchitectureCanvas'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import type { NodeType } from '@/types'

export function EditorToolbar() {
  const canUndo = useProjectStore((s) => s.canUndo)
  const canRedo = useProjectStore((s) => s.canRedo)
  const undo = useProjectStore((s) => s.undo)
  const redo = useProjectStore((s) => s.redo)
  const zoom = useUiStore((s) => s.zoom)
  const addMenuOpen = useUiStore((s) => s.addMenuOpen)
  const setAddMenuOpen = useUiStore((s) => s.setAddMenuOpen)

  const pickType = (type: NodeType) => {
    dispatchNodeType(type)
    setAddMenuOpen(false)
    window.dispatchEvent(new CustomEvent('architecture-canvas:add-node', { detail: { type } }))
  }

  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] p-1 shadow-sm dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
      <DropdownMenu open={addMenuOpen} onOpenChange={setAddMenuOpen}>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="ghost" className="pointer-events-auto h-8">
            <Plus className="mr-1 h-4 w-4" />
            Add
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" className="max-h-64 overflow-y-auto">
          {ADDABLE_NODE_TYPES.map((type) => (
            <DropdownMenuItem key={type} onSelect={() => pickType(type)}>
              <span
                className="mr-2 inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: NODE_CATALOG[type].defaultColor }}
              />
              {NODE_CATALOG[type].label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="pointer-events-auto h-8"
        disabled={!canUndo}
        onClick={() => undo()}
      >
        <Undo2 className="h-4 w-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="pointer-events-auto h-8"
        disabled={!canRedo}
        onClick={() => redo()}
      >
        <Redo2 className="h-4 w-4" />
      </Button>
      <span className="pointer-events-auto flex h-8 items-center px-2 text-xs text-[var(--color-muted)]">
        {Math.round(zoom * 100)}%
      </span>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="pointer-events-auto h-8"
        onClick={() => dispatchFitView()}
      >
        <Maximize2 className="h-4 w-4" />
        Fit
      </Button>
    </div>
  )
}
