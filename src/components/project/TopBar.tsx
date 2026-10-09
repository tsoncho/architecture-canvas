import { Braces, HelpCircle, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PresenceAvatars } from '@/components/collaboration/PresenceAvatars'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { cn } from '@/lib/utils'

type TopBarProps = {
  currentUserId: string
  onOpenQuickGuide: () => void
  onOpenAbout: () => void
}

const SAVE_LABEL = {
  saved: '✓ Saved',
  saving: 'Saving…',
  offline: 'Offline · Changes saved locally',
  error: "Couldn't sync. Changes are safe locally.",
} as const

export function TopBar({ currentUserId, onOpenQuickGuide, onOpenAbout }: TopBarProps) {
  const project = useProjectStore((s) => s.project)
  const members = useProjectStore((s) => s.members)
  const presence = useProjectStore((s) => s.presence)
  const saveStatus = useUiStore((s) => s.saveStatus)
  const setShareOpen = useUiStore((s) => s.setShareOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const setSpecOpen = useUiStore((s) => s.setSpecOpen)

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)]">
      <div className="flex min-w-0 items-center gap-3">
        <h1 className="truncate text-sm font-semibold">{project?.name ?? 'Project'}</h1>
        <span
          className={cn(
            'text-xs text-[var(--color-muted)]',
            saveStatus === 'error' && 'text-red-600',
            saveStatus === 'offline' && 'text-amber-600',
          )}
        >
          {SAVE_LABEL[saveStatus]}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <PresenceAvatars users={presence} currentUserId={currentUserId} />
        <Button type="button" size="sm" variant="outline" onClick={() => setSpecOpen(true)}>
          <Braces className="mr-1.5 h-3.5 w-3.5" />
          Spec
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setShareOpen(true)}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="ghost" aria-label="Help">
              <HelpCircle className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Help</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenQuickGuide}>Quick guide</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSpecOpen(true)}>
              Architecture Spec / AI
            </DropdownMenuItem>
            <DropdownMenuItem disabled>Shortcuts — N, Del, Ctrl+Z, Ctrl+C/V</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onOpenAbout}>About Architecture Canvas</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="hidden text-xs text-[var(--color-muted)] sm:inline">
          {members.length} member{members.length === 1 ? '' : 's'}
        </span>
      </div>
    </header>
  )
}
