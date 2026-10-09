import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Braces,
  ChevronDown,
  FolderOpen,
  HelpCircle,
  Home,
  ImageDown,
  Pencil,
  Plus,
  Settings,
  Share2,
  Trash2,
  Users,
} from 'lucide-react'
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
import { exportPng } from '@/features/export/png'
import { renameProject } from '@/features/projects/api'
import { removeRecentProjectLocal, upsertRecentProject } from '@/lib/storage/local'
import { getRecentProjects, useIdentityStore } from '@/stores/identity-store'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { cn, formatRelativeTime } from '@/lib/utils'
import type { RecentProject } from '@/types'

type TopBarProps = {
  currentUserId: string
  canvasHostRef: React.RefObject<HTMLDivElement | null>
  onOpenQuickGuide: () => void
  onOpenAbout: () => void
}

const SAVE_LABEL = {
  saved: '✓ Saved',
  saving: 'Saving…',
  offline: 'Offline · local',
  error: "Couldn't sync",
} as const

export function TopBar({
  currentUserId,
  canvasHostRef,
  onOpenQuickGuide,
  onOpenAbout,
}: TopBarProps) {
  const navigate = useNavigate()
  const project = useProjectStore((s) => s.project)
  const members = useProjectStore((s) => s.members)
  const presence = useProjectStore((s) => s.presence)
  const setProject = useProjectStore((s) => s.setProject)
  const displayName = useIdentityStore((s) => s.settings.displayName)
  const updateSettings = useIdentityStore((s) => s.updateSettings)
  const saveStatus = useUiStore((s) => s.saveStatus)
  const setShareOpen = useUiStore((s) => s.setShareOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const setSpecOpen = useUiStore((s) => s.setSpecOpen)
  const [recent, setRecent] = useState<RecentProject[]>(() => getRecentProjects())
  const [renaming, setRenaming] = useState(false)
  const [nameDraft, setNameDraft] = useState('')
  const [exporting, setExporting] = useState(false)
  const renameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setRecent(getRecentProjects())
  }, [project?.id, project?.name])

  useEffect(() => {
    if (renaming) renameRef.current?.focus()
  }, [renaming])

  const otherProjects = recent.filter((p) => p.id !== project?.id).slice(0, 8)

  const startRename = () => {
    if (!project) return
    setNameDraft(project.name)
    setRenaming(true)
  }

  const commitRename = async () => {
    if (!project) return
    const next = nameDraft.trim()
    setRenaming(false)
    if (!next || next === project.name) return
    try {
      const updated = await renameProject(project.id, next)
      setProject(updated)
      await upsertRecentProject({
        id: updated.id,
        name: updated.name,
        joinCode: updated.joinCode,
        memberCount: members.length,
        lastOpenedAt: new Date().toISOString(),
        updatedAt: updated.updatedAt,
      })
      setRecent(getRecentProjects())
    } catch {
      // Keep previous name on failure.
    }
  }

  const removeFromRecents = async () => {
    if (!project) return
    await removeRecentProjectLocal(project.id)
    if (useIdentityStore.getState().settings.lastProjectId === project.id) {
      updateSettings({ lastProjectId: null })
    }
    navigate('/home')
  }

  const onExportPng = async () => {
    const host = canvasHostRef.current?.querySelector('.react-flow') as HTMLElement | null
    if (!host || !project) return
    setExporting(true)
    try {
      await exportPng(host, `${project.name || 'architecture'}.png`)
    } finally {
      setExporting(false)
    }
  }

  return (
    <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-3 dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)] sm:px-4">
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        {renaming ? (
          <input
            ref={renameRef}
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            onBlur={() => void commitRename()}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void commitRename()
              if (e.key === 'Escape') setRenaming(false)
            }}
            className="max-w-[min(100%,18rem)] rounded-[var(--radius-sm)] border border-[var(--color-accent)] bg-transparent px-2 py-1 text-sm font-semibold outline-none"
          />
        ) : (
          <DropdownMenu
            onOpenChange={(open) => {
              if (open) setRecent(getRecentProjects())
            }}
          >
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="max-w-[min(100%,18rem)] gap-1 px-2 font-semibold"
              >
                <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-70" />
                <span className="truncate">{project?.name ?? 'Project'}</span>
                <ChevronDown className="h-3.5 w-3.5 shrink-0 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="font-normal">
                <div className="truncate text-sm font-medium text-[var(--color-ink)] dark:text-[var(--color-ink-dark)]">
                  {project?.name ?? 'Project'}
                </div>
                {displayName ? (
                  <div className="truncate text-xs text-[var(--color-muted)]">
                    Working as {displayName}
                  </div>
                ) : null}
                {project?.joinCode ? (
                  <div className="mt-0.5 font-mono text-[10px] text-[var(--color-muted)]">
                    Code {project.joinCode}
                  </div>
                ) : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={startRename}>
                <Pencil className="mr-2 h-3.5 w-3.5" />
                Rename project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void removeFromRecents()}>
                <Trash2 className="mr-2 h-3.5 w-3.5" />
                Remove from recent
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => navigate('/home')}>
                <Home className="mr-2 h-3.5 w-3.5" />
                All projects
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/create')}>
                <Plus className="mr-2 h-3.5 w-3.5" />
                New project
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate('/join')}>
                <Users className="mr-2 h-3.5 w-3.5" />
                Join with code
              </DropdownMenuItem>
              {otherProjects.length > 0 ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Switch project</DropdownMenuLabel>
                  {otherProjects.map((p) => (
                    <DropdownMenuItem key={p.id} onSelect={() => navigate(`/project/${p.id}`)}>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm">{p.name}</div>
                        <div className="truncate text-[10px] text-[var(--color-muted)]">
                          {formatRelativeTime(p.lastOpenedAt)} · {p.joinCode}
                        </div>
                      </div>
                    </DropdownMenuItem>
                  ))}
                </>
              ) : null}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/">Welcome</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        <span
          className={cn(
            'hidden text-xs text-[var(--color-muted)] sm:inline',
            saveStatus === 'error' && 'text-red-600',
            saveStatus === 'offline' && 'text-amber-600',
          )}
        >
          {SAVE_LABEL[saveStatus]}
        </span>
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2">
        <PresenceAvatars users={presence} currentUserId={currentUserId} />
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={exporting}
          onClick={() => void onExportPng()}
        >
          <ImageDown className="mr-1.5 h-3.5 w-3.5" />
          PNG
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setSpecOpen(true)}>
          <Braces className="mr-1.5 h-3.5 w-3.5" />
          Spec
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={() => setShareOpen(true)}>
          <Share2 className="mr-1.5 h-3.5 w-3.5" />
          Share
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          aria-label="Settings"
          onClick={() => setSettingsOpen(true)}
        >
          <Settings className="h-4 w-4" />
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
            <DropdownMenuItem onSelect={onOpenAbout}>About & shortcuts</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSpecOpen(true)}>Architecture Spec / AI</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => setSettingsOpen(true)}>Settings</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="hidden text-xs text-[var(--color-muted)] md:inline">
          {members.length}/3
        </span>
      </div>
    </header>
  )
}
