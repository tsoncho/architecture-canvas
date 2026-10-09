import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ToastHost } from '@/components/ui/ToastHost'
import { applyAppearanceClass } from '@/lib/appearance'
import { ensureAuth } from '@/features/projects/api'
import { checkForAppUpdate } from '@/lib/updater'
import { useIdentityStore } from '@/stores/identity-store'
import { WelcomePage } from '@/pages/WelcomePage'
import { HomePage } from '@/pages/HomePage'
import { CreateProjectPage } from '@/pages/CreateProjectPage'
import { JoinProjectPage } from '@/pages/JoinProjectPage'
import { EditorPage } from '@/pages/EditorPage'

function AppShell() {
  const hydrated = useIdentityStore((s) => s.hydrated)
  const hydrate = useIdentityStore((s) => s.hydrate)
  const settings = useIdentityStore((s) => s.settings)

  useEffect(() => {
    hydrate()
  }, [hydrate])

  useEffect(() => {
    if (!hydrated) return
    applyAppearanceClass(settings)
  }, [hydrated, settings])

  useEffect(() => {
    if (!hydrated) return
    void ensureAuth().catch(() => {})
  }, [hydrated])

  useEffect(() => {
    if (!hydrated) return
    // Desktop builds only — quiet check against GitHub Releases
    const timer = window.setTimeout(() => {
      void checkForAppUpdate({ quiet: true })
    }, 2500)
    return () => window.clearTimeout(timer)
  }, [hydrated])

  if (!hydrated) {
    return (
      <div className="flex min-h-full items-center justify-center text-sm text-[var(--color-muted)]">
        Loading…
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/home" element={<HomePage />} />
      <Route path="/create" element={<CreateProjectPage />} />
      <Route path="/join" element={<JoinProjectPage />} />
      <Route path="/project/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
      <ToastHost />
    </BrowserRouter>
  )
}
