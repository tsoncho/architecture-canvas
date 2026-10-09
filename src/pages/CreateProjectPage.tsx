import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useIdentityStore } from '@/stores/identity-store'
import {
  createProject,
  ensureAuth,
  insertTemplateContent,
} from '@/features/projects/api'
import { PROJECT_TEMPLATES, type ProjectTemplate } from '@/features/projects/templates'

type TemplateId = ProjectTemplate['id']
import { upsertRecentProject, saveSnapshot } from '@/lib/storage/local'

export function CreateProjectPage() {
  const navigate = useNavigate()
  const displayName = useIdentityStore((s) => s.settings.displayName)
  const setDisplayName = useIdentityStore((s) => s.setDisplayName)
  const [name, setName] = useState(displayName)
  const [projectName, setProjectName] = useState('')
  const [templateId, setTemplateId] = useState<TemplateId | 'blank'>('blank')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onCreate() {
    setBusy(true)
    setError(null)
    try {
      setDisplayName(name.trim())
      const userId = await ensureAuth()
      const project = await createProject(projectName, name.trim())
      let nodes = [] as Awaited<ReturnType<typeof insertTemplateContent>>['nodes']
      let edges = [] as Awaited<ReturnType<typeof insertTemplateContent>>['edges']
      if (templateId !== 'blank') {
        const template = PROJECT_TEMPLATES.find((t) => t.id === templateId)
        if (template) {
          const result = await insertTemplateContent(project.id, userId, template)
          nodes = result.nodes
          edges = result.edges
        }
      }
      const snapshot = {
        project,
        members: [
          {
            id: crypto.randomUUID(),
            projectId: project.id,
            userId,
            displayName: name.trim(),
            createdAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
          },
        ],
        nodes,
        edges,
        cachedAt: new Date().toISOString(),
      }
      await saveSnapshot(snapshot)
      await upsertRecentProject({
        id: project.id,
        name: project.name,
        joinCode: project.joinCode,
        memberCount: 1,
        lastOpenedAt: new Date().toISOString(),
        updatedAt: project.updatedAt,
      })
      navigate(`/project/${project.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex h-full w-full max-w-md flex-col justify-center px-6">
      <h1 className="text-2xl font-semibold tracking-tight">Create project</h1>
      <p className="mt-1 text-sm text-[var(--color-muted)]">
        Enter your name and a project name to start designing.
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
        Project name
      </label>
      <Input
        className="mt-1.5"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
        placeholder="Payment Platform"
      />

      <label className="mt-4 block text-xs font-medium text-[var(--color-muted)]">
        Template
      </label>
      <div className="mt-1.5 grid grid-cols-2 gap-2">
        <TemplateChip
          label="Blank"
          active={templateId === 'blank'}
          onClick={() => setTemplateId('blank')}
        />
        {PROJECT_TEMPLATES.map((t) => (
          <TemplateChip
            key={t.id}
            label={t.name}
            active={templateId === t.id}
            onClick={() => setTemplateId(t.id)}
          />
        ))}
      </div>

      {error ? (
        <p className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}

      <div className="mt-8 flex gap-3">
        <Button variant="ghost" className="flex-1" onClick={() => navigate(-1)}>
          Back
        </Button>
        <Button
          className="flex-1"
          disabled={busy || !name.trim() || !projectName.trim()}
          onClick={() => void onCreate()}
        >
          {busy ? 'Creating…' : 'Create'}
        </Button>
      </div>
    </div>
  )
}

function TemplateChip({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius-sm)] border px-3 py-2 text-left text-xs transition ${
        active
          ? 'border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-ink)] dark:text-[var(--color-ink-dark)]'
          : 'border-[var(--color-border)] text-[var(--color-muted)] hover:border-[var(--color-accent)]/40 dark:border-[var(--color-border-dark)]'
      }`}
    >
      {label}
    </button>
  )
}
