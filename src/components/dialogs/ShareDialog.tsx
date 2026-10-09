import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
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
import { leaveProject } from '@/features/projects/api'
import { removeRecentProjectLocal } from '@/lib/storage/local'
import { useIdentityStore } from '@/stores/identity-store'
import { toast } from '@/stores/toast-store'
import type { ProjectMember } from '@/types'

const MAX_MEMBERS = 3

type ShareDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  projectId: string
  joinCode: string
  members: ProjectMember[]
  currentUserId: string
}

export function ShareDialog({
  open,
  onOpenChange,
  projectId,
  joinCode,
  members,
  currentUserId,
}: ShareDialogProps) {
  const navigate = useNavigate()
  const [copied, setCopied] = useState(false)
  const [leaving, setLeaving] = useState(false)
  const fullMessage = `Join my Architecture Canvas project with code ${joinCode}`
  const isFull = members.length >= MAX_MEMBERS

  const onLeave = async () => {
    const ok = window.confirm('Leave this project? You can rejoin later with the share code.')
    if (!ok) return
    setLeaving(true)
    try {
      await leaveProject(projectId)
      await removeRecentProjectLocal(projectId)
      const settings = useIdentityStore.getState().settings
      if (settings.lastProjectId === projectId) {
        useIdentityStore.getState().updateSettings({ lastProjectId: null })
      }
      toast('Left project')
      onOpenChange(false)
      navigate('/home')
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not leave project.', 'error')
    } finally {
      setLeaving(false)
    }
  }

  const copyText = async (value: string, label = 'Copied') => {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      toast(label)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
      toast('Could not copy to clipboard.', 'error')
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
              <Button
                type="button"
                variant="outline"
                onClick={() => void copyText(joinCode, 'Join code copied')}
              >
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
        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600"
            disabled={leaving}
            onClick={() => void onLeave()}
          >
            {leaving ? 'Leaving…' : 'Leave project'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={() => void copyText(fullMessage, 'Invite message copied')}
          >
            Copy invite message
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
