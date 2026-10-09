import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getRecentProjects } from '@/stores/identity-store'
import { formatRelativeTime } from '@/lib/utils'

export function WelcomePage() {
  const recent = getRecentProjects()

  return (
    <div className="flex min-h-full flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-md text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-[var(--color-muted)]">
          Architecture Canvas
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Map systems together</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          Design architecture diagrams with live collaboration — minimal, fast, and shareable.
        </p>
        <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button asChild>
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
              {recent.slice(0, 3).map((p) => (
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
