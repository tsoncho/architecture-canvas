import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

const MAX_MEMBERS = 3

type ShareDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  joinCode: string
  memberCount: number
}

export function ShareDialog({ open, onOpenChange, joinCode, memberCount }: ShareDialogProps) {
  const [copied, setCopied] = useState<'code' | 'link' | null>(null)
  const joinLink = `architecturecanvas://join/${joinCode}`
  const fullMessage = `Join my Architecture Canvas project with code ${joinCode}`
  const isFull = memberCount >= MAX_MEMBERS

  const copyText = async (value: string, kind: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(kind)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border border-[var(--color-border)] bg-[var(--color-surface)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
        <DialogHeader>
          <DialogTitle>Share project</DialogTitle>
          <DialogDescription>
            Teammates enter this code on the join screen. Up to {MAX_MEMBERS} people per project.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <label className="text-xs font-medium text-[var(--color-muted)]">Project code</label>
          <div className="flex gap-2">
            <Input readOnly value={joinCode} className="font-mono tracking-wider" />
            <Button type="button" variant="outline" onClick={() => void copyText(joinCode, 'code')}>
              {copied === 'code' ? 'Copied' : 'Copy code'}
            </Button>
          </div>
          <div className="flex gap-2">
            <Input readOnly value={joinLink} className="font-mono text-xs" />
            <Button type="button" variant="outline" onClick={() => void copyText(joinLink, 'link')}>
              {copied === 'link' ? 'Copied' : 'Copy link'}
            </Button>
          </div>
          <p className="text-sm text-[var(--color-muted)]">
            {memberCount} / {MAX_MEMBERS} people
          </p>
          {isFull ? (
            <p className="text-sm text-amber-700 dark:text-amber-300">
              Project is currently full.
            </p>
          ) : (
            <p className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm dark:border-[var(--color-border-dark)] dark:bg-[var(--color-canvas-dark)]">
              {fullMessage}
            </p>
          )}
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => void copyText(fullMessage, 'code')}>
            Copy invite message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
