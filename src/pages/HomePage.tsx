import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { getRecentProjects } from '@/stores/identity-store'
import { formatRelativeTime } from '@/lib/utils'

export function HomePage() {
  const recent = getRecentProjects()

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Projects</h1>
          <p className="mt-1 text-sm text-[var(--color-muted)]">Pick up where you left off.</p>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <Link to="/join">Join</Link>
          </Button>
          <Button asChild size="sm">
            <Link to="/create">New project</Link>
          </Button>
        </div>
      </div>
      {recent.length === 0 ? (
        <div className="mt-16 rounded-md border border-dashed border-[var(--color-border)] px-6 py-12 text-center dark:border-[var(--color-border-dark)]">
          <p className="text-sm text-[var(--color-muted)]">No projects yet.</p>
          <Button asChild className="mt-4" size="sm">
            <Link to="/create">Create your first</Link>
          </Button>
        </div>
      ) : (
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {recent.map((p) => (
            <li key={p.id}>
              <Link
                to={`/project/${p.id}`}
                className="block rounded-md border border-[var(--color-border)] p-4 transition-colors hover:border-[var(--color-accent)]/40 dark:border-[var(--color-border-dark)]"
              >
                <p className="font-medium">{p.name}</p>
                <p className="mt-1 font-mono text-xs text-[var(--color-muted)]">{p.joinCode}</p>
                <p className="mt-3 text-xs text-[var(--color-muted)]">
                  Opened {formatRelativeTime(p.lastOpenedAt)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
