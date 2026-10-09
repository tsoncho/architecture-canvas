import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArchitectureCanvas } from '@/components/canvas/ArchitectureCanvas'
import { PropertyPanel } from '@/components/canvas/PropertyPanel'
import { ShareDialog } from '@/components/dialogs/ShareDialog'
import { SpecDialog } from '@/components/dialogs/SpecDialog'
import { SettingsDialog } from '@/components/dialogs/SettingsDialog'
import { TopBar } from '@/components/project/TopBar'
import { EditorToolbar } from '@/components/toolbar/EditorToolbar'
import { QuickGuide } from '@/features/onboarding/QuickGuide'
import { syncEngine } from '@/features/collaboration/sync'
import { ensureAuth, loadProject, touchMember } from '@/features/projects/api'
import { applyAppearanceClass } from '@/lib/appearance'
import { getSnapshot, upsertRecentProject } from '@/lib/storage/local'
import { useIdentityStore } from '@/stores/identity-store'
import { useProjectStore } from '@/stores/project-store'
import { useUiStore } from '@/stores/ui-store'
import { Button } from '@/components/ui/button'

export function EditorPage() {
  const { id: projectId } = useParams<{ id: string }>()
  const canvasRef = useRef<HTMLDivElement>(null)

  const settings = useIdentityStore((s) => s.settings)
  const updateSettings = useIdentityStore((s) => s.updateSettings)
  const ensureIdentity = useIdentityStore((s) => s.ensureIdentity)

  const setProjectData = useProjectStore((s) => s.setProjectData)
  const reset = useProjectStore((s) => s.reset)
  const project = useProjectStore((s) => s.project)
  const members = useProjectStore((s) => s.members)

  const shareOpen = useUiStore((s) => s.shareOpen)
  const settingsOpen = useUiStore((s) => s.settingsOpen)
  const onboardingOpen = useUiStore((s) => s.onboardingOpen)
  const specOpen = useUiStore((s) => s.specOpen)
  const setShareOpen = useUiStore((s) => s.setShareOpen)
  const setSettingsOpen = useUiStore((s) => s.setSettingsOpen)
  const setOnboardingOpen = useUiStore((s) => s.setOnboardingOpen)
  const setSpecOpen = useUiStore((s) => s.setSpecOpen)

  const [userId, setUserId] = useState<string | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const displayName = settings.displayName || ensureIdentity().displayName

  const finishOnboarding = useCallback(() => {
    updateSettings({ onboardingSeen: true })
    setOnboardingOpen(false)
  }, [updateSettings, setOnboardingOpen])

  useEffect(() => {
    if (!projectId) return
    let cancelled = false

    const run = async () => {
      setLoading(true)
      setLoadError(null)
      try {
        let uid: string | null = null
        try {
          uid = await ensureAuth()
        } catch {
          uid = null
        }
        if (cancelled) return
        if (uid) setUserId(uid)

        let snapshot
        try {
          snapshot = await loadProject(projectId)
        } catch (onlineError) {
          const cached = await getSnapshot(projectId)
          if (!cached) throw onlineError
          snapshot = cached
          useUiStore.getState().setSaveStatus('offline')
        }
        if (cancelled) return
        setProjectData(snapshot)
        if (!uid) {
          setUserId('offline-local')
        }
        await upsertRecentProject({
          id: snapshot.project.id,
          name: snapshot.project.name,
          joinCode: snapshot.project.joinCode,
          memberCount: snapshot.members.length,
          lastOpenedAt: new Date().toISOString(),
          updatedAt: snapshot.project.updatedAt,
        })
        if (uid) {
          await syncEngine.start(projectId, uid, displayName)
          await touchMember(projectId).catch(() => {})
        }
        if (!settings.onboardingSeen) {
          setOnboardingOpen(true)
        }
      } catch (e) {
        if (!cancelled) {
          setLoadError(e instanceof Error ? e.message : 'Could not open project.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void run()

    const interval = window.setInterval(() => {
      void touchMember(projectId).catch(() => {})
    }, 60_000)

    return () => {
      cancelled = true
      clearInterval(interval)
      void syncEngine.stop()
      reset()
    }
  }, [
    projectId,
    setProjectData,
    reset,
    displayName,
    settings.onboardingSeen,
    setOnboardingOpen,
  ])

  if (!projectId) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-[var(--color-muted)]">
        Missing project id.
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-[var(--color-muted)]">
        Loading project…
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex min-h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm text-red-600">{loadError}</p>
        <Button asChild variant="outline" size="sm">
          <Link to="/home">Back to projects</Link>
        </Button>
      </div>
    )
  }

  if (!userId || !project) return null

  return (
    <div className="flex h-full flex-col">
      <TopBar
        currentUserId={userId}
        onOpenQuickGuide={() => setOnboardingOpen(true)}
        onOpenAbout={() => {
          window.alert('Architecture Canvas — collaborative system diagrams.')
        }}
      />
      <div className="relative flex min-h-0 flex-1">
        <div ref={canvasRef} className="relative min-w-0 flex-1">
          <ArchitectureCanvas userId={userId} />
          <EditorToolbar />
        </div>
        <PropertyPanel />
      </div>
      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        joinCode={project.joinCode}
        memberCount={members.length}
      />
      <SpecDialog open={specOpen} onOpenChange={setSpecOpen} userId={userId} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onAppearanceChange={(appearance) => applyAppearanceClass({ ...settings, appearance })}
      />
      <QuickGuide
        open={onboardingOpen}
        onOpenChange={setOnboardingOpen}
        onStart={finishOnboarding}
      />
    </div>
  )
}
