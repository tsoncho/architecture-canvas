import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIdentityStore } from '@/stores/identity-store'
import { joinProject, loadProject } from '@/features/projects/api'
import { saveSnapshot, upsertRecentProject } from '@/lib/storage/local'

export function JoinProjectPage() {
  const navigate = useNavigate()
  const displayName = useIdentityStore((s) => s.settings.displayName)
  const setDisplayName = useIdentityStore((s) => s.setDisplayName)
  const [name, setName] = useState(displayName)
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onJoin() {
    setBusy(true)
    setError(null)
    try {
      setDisplayName(name.trim())
      const project = await joinProject(code, name.trim())
      const snapshot = await loadProject(project.id)
      await saveSnapshot(snapshot)
      await upsertRecentProject({
        id: project.id,
        name: project.name,
        joinCode: project.joinCode,
        memberCount: snapshot.members.length,
        lastOpenedAt: new Date().toISOString(),
        updatedAt: project.updatedAt,
      })
      navigate(`/project/${project.id}`)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Something went wrong.'
      if (message.toLowerCase().includes('full')) {
        setError('Project is currently full (3 / 3 people).')
      } else {
        setError(message)
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Join project</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Enter your name and the project code shared with you.
      </p>

      <label className="mt-8 block text-xs font-medium text-[var(--color-muted)]">
        Your name
      </label>
      <Input
        className="mt-1.5"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tsoncho"
        autoFocus
      />

      <label className="mt-4 block text-xs font-medium text-[var(--color-muted)]">
        Project code
      </label>
      <Input
        className="mt-1.5 font-mono uppercase tracking-wider"
        value={code}
        onChange={(e) => setCode(e.target.value.toUpperCase())}
        placeholder="7K2-FQ9"
      />

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={busy || !name.trim() || !code.trim()}
          onClick={() => void onJoin()}
        >
          {busy ? 'Joining…' : 'Join'}
        </Button>
      </div>
    </div>
  )
}
