import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getRecentProjects, useIdentityStore } from '@/stores/identity-store'
import { syncRecentProjectsToLocalStorage } from '@/lib/storage/local'
import { formatRelativeTime } from '@/lib/utils'
import type { RecentProject } from '@/types'

export function WelcomePage() {
  const navigate = useNavigate()
  const settings = useIdentityStore((s) => s.settings)
  const [recent, setRecent] = useState<RecentProject[]>(() => getRecentProjects())
  const [ready, setReady] = useState(false)

  const displayName = settings.displayName.trim()
  const lastProject =
    recent.find((p) => p.id === settings.lastProjectId) ?? recent[0] ?? null

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const local = getRecentProjects()
      if (local.length > 0) {
        if (!cancelled) {
          setRecent(local)
          setReady(true)
        }
        return
      }
      const migrated = await syncRecentProjectsToLocalStorage()
      if (!cancelled) {
        setRecent(migrated.length > 0 ? migrated : getRecentProjects())
        setReady(true)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (!ready) return
    // One auto-resume per browser session so Home/Welcome stay reachable afterward.
    const flag = 'architecture-canvas:did-auto-resume'
    if (sessionStorage.getItem(flag)) return
    if (displayName && lastProject && settings.lastProjectId === lastProject.id) {
      sessionStorage.setItem(flag, '1')
      navigate(`/project/${lastProject.id}`, { replace: true })
    }
  }, [ready, displayName, lastProject, settings.lastProjectId, navigate])

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-20">
      <div className="w-full max-w-md text-center">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">
          Architecture Canvas
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight">Map systems together</h1>
        <p className="mt-3 text-sm leading-relaxed text-[var(--color-muted)]">
          Design architecture diagrams with live collaboration — minimal, fast, and shareable.
        </p>
        {displayName ? (
          <p className="mt-4 text-sm text-[var(--color-muted)]">
            Signed in as <span className="font-medium text-[var(--color-ink)]">{displayName}</span>
          </p>
        ) : null}
        {lastProject ? (
          <div className="mt-8">
            <Button asChild className="w-full sm:w-auto">
              <Link to={`/project/${lastProject.id}`}>
                Continue “{lastProject.name}”
              </Link>
            </Button>
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Opened {formatRelativeTime(lastProject.lastOpenedAt)}
            </p>
          </div>
        ) : null}
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild variant={lastProject ? 'outline' : 'default'}>
            <Link to="/create">Create project</Link>
          </Button>
          <Button asChild variant="outline">
            <Link to="/join">Join project</Link>
          </Button>
        </div>
        {recent.length > 0 ? (
          <div className="mt-10 text-left">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-xs font-medium text-[var(--color-muted)]">Recent</p>
              <Link to="/home" className="text-xs text-[var(--color-accent)] hover:underline">
                View all
              </Link>
            </div>
            <ul className="space-y-2">
              {recent.slice(0, 5).map((p) => (
                <li key={p.id}>
                  <Link
                    to={`/project/${p.id}`}
                    className="flex items-center justify-between rounded-md border border-[var(--color-border)] px-3 py-2 text-sm hover:bg-black/[0.02] dark:border-[var(--color-border-dark)] dark:hover:bg-white/[0.03]"
                  >
                    <span className="truncate font-medium">{p.name}</span>
                    <span className="ml-2 shrink-0 text-xs text-[var(--color-muted)]">
                      {formatRelativeTime(p.lastOpenedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  )
}
