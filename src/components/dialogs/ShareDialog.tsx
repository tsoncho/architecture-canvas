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
import type { ProjectMember } from '@/types'

const MAX_MEMBERS = 3

type ShareDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  joinCode: string
  members: ProjectMember[]
  currentUserId: string
}

export function ShareDialog({
  open,
  onOpenChange,
  joinCode,
  members,
  currentUserId,
}: ShareDialogProps) {
  const [copied, setCopied] = useState(false)
  const fullMessage = `Join my Architecture Canvas project with code ${joinCode}`
  const isFull = members.length >= MAX_MEMBERS

  const copyText = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
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
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-xs font-medium text-[var(--color-muted)]">Project code</label>
            <div className="flex gap-2">
              <Input readOnly value={joinCode} className="font-mono tracking-wider" />
              <Button type="button" variant="outline" onClick={() => void copyText(joinCode)}>
                {copied ? 'Copied' : 'Copy'}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-medium text-[var(--color-muted)]">
              People ({members.length}/{MAX_MEMBERS})
            </p>
            <ul className="space-y-1.5">
              {members.map((m) => (
                <li
                  key={m.id}
                  className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2 text-sm dark:border-[var(--color-border-dark)]"
                >
                  <span className="truncate font-medium">
                    {m.displayName || 'Guest'}
                    {m.userId === currentUserId ? (
                      <span className="ml-1.5 text-xs font-normal text-[var(--color-muted)]">
                        you
                      </span>
                    ) : null}
                  </span>
                </li>
              ))}
            </ul>
            {isFull ? (
              <p className="text-sm text-amber-700 dark:text-amber-300">Project is currently full.</p>
            ) : (
              <p className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-canvas)] px-3 py-2 text-sm dark:border-[var(--color-border-dark)] dark:bg-[var(--color-canvas-dark)]">
                {fullMessage}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => void copyText(fullMessage)}>
            Copy invite message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
