import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const STEPS = [
  {
    title: 'Add components',
    body: 'Use the toolbar or double-click the canvas to place applications, APIs, databases, and more.',
  },
  {
    title: 'Move freely',
    body: 'Drag the canvas to pan. Shift-drag to box-select, Shift-click to multi-select, then drag the group together.',
  },
  {
    title: 'Connect the flow',
    body: 'Drag from a node handle to another. Links route cleanly as you rearrange boxes.',
  },
  {
    title: 'Share & export',
    body: 'Share a join code with up to 2 teammates. Export PNG or Spec JSON — files land in your Downloads folder.',
  },
]

type QuickGuideProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStart: () => void
}

export function QuickGuide({ open, onOpenChange, onStart }: QuickGuideProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-[var(--color-border)] bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
        <DialogHeader>
          <DialogTitle>Quick guide</DialogTitle>
          <DialogDescription>
            Four steps to map your architecture in minutes.
          </DialogDescription>
        </DialogHeader>
        <ol className="space-y-4 py-2">
          {STEPS.map((step, index) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--color-border)] text-xs font-medium dark:border-[var(--color-border-dark)]">
                {index + 1}
              </span>
              <div>
                <p className="text-sm font-medium">{step.title}</p>
                <p className="text-sm text-[var(--color-muted)]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <DialogFooter>
          <Button type="button" onClick={onStart}>
            Start designing
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
