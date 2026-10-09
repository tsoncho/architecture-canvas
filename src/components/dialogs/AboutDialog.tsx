import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

type AboutDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutDialog({ open, onOpenChange }: AboutDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
        <DialogHeader>
          <DialogTitle>Architecture Canvas</DialogTitle>
          <DialogDescription>
            Lightweight collaborative system diagrams for small teams — Spec in, Spec out, live
            refine with up to three people.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-[var(--color-muted)]">
          <p className="font-medium text-[var(--color-ink)] dark:text-[var(--color-ink-dark)]">
            Shortcuts
          </p>
          <ul className="space-y-1.5 font-mono text-xs leading-relaxed">
            <li>Drag canvas — pan</li>
            <li>Shift-drag — box select</li>
            <li>Shift-click — multi-select</li>
            <li>N / double-click — add node</li>
            <li>Delete — remove selection</li>
            <li>Ctrl+Z / Y — undo / redo (labeled history)</li>
            <li>Ctrl+C / V / D — copy / paste / duplicate</li>
            <li>F — fit view</li>
          </ul>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
