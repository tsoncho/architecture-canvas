import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { applyArchitectureSpec } from '@/features/spec/apply'
import {
  exportArchitectureSpec,
  parseArchitectureSpec,
  stringifyArchitectureSpec,
} from '@/features/spec/format'
import { buildAiArchitecturePrompt, SPEC_FORMAT_SUMMARY } from '@/features/spec/prompt'
import { dispatchFitView } from '@/components/canvas/ArchitectureCanvas'
import { downloadText, downloadsFolderMessage, sanitizeFilename } from '@/lib/download'
import { useProjectStore } from '@/stores/project-store'
import { toast } from '@/stores/toast-store'
import { cn } from '@/lib/utils'

type SpecDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  userId: string
}

type Tab = 'export' | 'import' | 'ai'

export function SpecDialog({ open, onOpenChange, userId }: SpecDialogProps) {
  const project = useProjectStore((s) => s.project)
  const nodes = useProjectStore((s) => s.nodes)
  const edges = useProjectStore((s) => s.edges)

  const [tab, setTab] = useState<Tab>('ai')
  const [importText, setImportText] = useState('')
  const [brief, setBrief] = useState('')
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const exported = useMemo(
    () =>
      stringifyArchitectureSpec(
        exportArchitectureSpec({
          name: project?.name,
          nodes,
          edges,
        }),
      ),
    [project?.name, nodes, edges],
  )

  const aiPrompt = useMemo(
    () =>
      buildAiArchitecturePrompt({
        projectName: project?.name,
        existingSpecJson: nodes.length > 0 ? exported.trim() : undefined,
        userBrief: brief,
      }),
    [project?.name, exported, nodes.length, brief],
  )

  const copy = async (text: string, okMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setError(null)
      setStatus(okMessage)
      toast(okMessage)
    } catch {
      setError('Could not copy to clipboard.')
      toast('Could not copy to clipboard.', 'error')
    }
  }

  const download = (text: string, fileName: string) => {
    const savedAs = downloadText(text, fileName)
    const message = downloadsFolderMessage(savedAs)
    setError(null)
    setStatus(message)
    toast(message)
  }

  const onImport = async () => {
    if (!project) return
    if (nodes.length > 0 || edges.length > 0) {
      const ok = window.confirm(
        `Replace the current diagram (${nodes.length} components, ${edges.length} connections) with this Spec?\n\nYou can undo with Ctrl+Z after import.`,
      )
      if (!ok) return
    }
    setBusy(true)
    setError(null)
    setStatus(null)
    try {
      const spec = parseArchitectureSpec(importText)
      await applyArchitectureSpec({
        spec,
        projectId: project.id,
        userId,
      })
      const message = `Imported ${spec.nodes.length} components and ${spec.edges.length} connections`
      setStatus(message)
      toast(message)
      window.setTimeout(() => dispatchFitView(), 50)
      onOpenChange(false)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not import that Spec.'
      setError(message)
      toast(message, 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden border border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-ink)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-surface-dark)] dark:text-[var(--color-ink-dark)]">
        <DialogHeader>
          <DialogTitle>Architecture Spec</DialogTitle>
          <DialogDescription className="text-[var(--color-muted)]">
            {SPEC_FORMAT_SUMMARY}
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] p-1 dark:border-[var(--color-border-dark)]">
          {(
            [
              ['ai', 'Ask AI'],
              ['export', 'Export'],
              ['import', 'Import'],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setTab(id)
                setError(null)
                setStatus(null)
              }}
              className={cn(
                'flex-1 rounded-[var(--radius-sm)] px-3 py-1.5 text-sm transition',
                tab === id
                  ? 'bg-[var(--color-accent)] text-white'
                  : 'text-[var(--color-muted)] hover:bg-[color-mix(in_srgb,var(--color-border)_45%,transparent)]',
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-auto">
          {tab === 'export' ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-muted)]">
                Copy or download your current diagram as JSON. Paste it into an AI chat to iterate,
                or keep it as documentation.
              </p>
              <textarea
                readOnly
                value={exported}
                className="h-64 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 font-mono text-xs text-[var(--color-ink)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-canvas-dark)] dark:text-[var(--color-ink-dark)]"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copy(exported, 'Spec copied.')}>
                  Copy Spec
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() =>
                    download(
                      exported,
                      `${sanitizeFilename(
                        (project?.name ?? 'architecture').toLowerCase(),
                      )}.architecture.json`,
                    )
                  }
                >
                  Download JSON
                </Button>
              </div>
            </div>
          ) : null}

          {tab === 'import' ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-muted)]">
                Paste Architecture Spec JSON from an AI (or a teammate). This replaces the current
                canvas contents.
              </p>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder='{ "version": 1, "nodes": [...], "edges": [...] }'
                className="h-64 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 font-mono text-xs text-[var(--color-ink)] placeholder:text-[var(--color-muted)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-canvas-dark)] dark:text-[var(--color-ink-dark)]"
              />
              <Button
                type="button"
                disabled={busy || !importText.trim() || !project}
                onClick={() => void onImport()}
              >
                {busy ? 'Importing…' : 'Import into canvas'}
              </Button>
            </div>
          ) : null}

          {tab === 'ai' ? (
            <div className="space-y-3">
              <p className="text-sm text-[var(--color-muted)]">
                1) Paste your product docs below → 2) copy the prompt into ChatGPT / Claude / Cursor
                → 3) paste the JSON reply into <strong>Import</strong>.
              </p>
              <label className="block text-xs font-medium text-[var(--color-muted)]">
                Your docs / brief
              </label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                placeholder="We are building a mobile banking app with… authentication, payments, notifications…"
                className="h-28 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 text-sm text-[var(--color-ink)] placeholder:text-[var(--color-muted)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-canvas-dark)] dark:text-[var(--color-ink-dark)]"
              />
              <label className="block text-xs font-medium text-[var(--color-muted)]">
                Ready-to-paste AI prompt
              </label>
              <textarea
                readOnly
                value={aiPrompt}
                className="h-48 w-full resize-none rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-canvas)] p-3 font-mono text-[11px] leading-relaxed text-[var(--color-ink)] dark:border-[var(--color-border-dark)] dark:bg-[var(--color-canvas-dark)] dark:text-[var(--color-ink-dark)]"
              />
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => void copy(aiPrompt, 'Prompt copied.')}>
                  Copy AI prompt
                </Button>
                {nodes.length > 0 ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void copy(exported, 'Current Spec copied.')}
                  >
                    Copy current Spec only
                  </Button>
                ) : null}
              </div>
            </div>
          ) : null}
        </div>

        {error ? (
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        ) : null}
        {status ? (
          <p className="text-sm text-[var(--color-muted)]">{status}</p>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
