import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { checkForAppUpdate } from '@/lib/updater'
import { useIdentityStore } from '@/stores/identity-store'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const settings = useIdentityStore((s) => s.settings)
  const updateSettings = useIdentityStore((s) => s.updateSettings)
  const setDisplayName = useIdentityStore((s) => s.setDisplayName)
  const [checkingUpdate, setCheckingUpdate] = useState(false)

  const onCheckUpdate = async () => {
    setCheckingUpdate(true)
    try {
      await checkForAppUpdate({ quiet: false })
    } finally {
      setCheckingUpdate(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-[var(--color-border)] bg-[var(--color-surface)]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Editor preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="grid">Show grid</Label>
              <p className="text-xs text-[var(--color-muted)]">Dot grid on the canvas</p>
            </div>
            <Switch
              id="grid"
              checked={settings.showGrid}
              onCheckedChange={(showGrid) => updateSettings({ showGrid })}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="motion">Reduced motion</Label>
              <p className="text-xs text-[var(--color-muted)]">Minimize animations</p>
            </div>
            <Switch
              id="motion"
              checked={settings.reducedMotion}
              onCheckedChange={(reducedMotion) => updateSettings({ reducedMotion })}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="display-name">Your name</Label>
            <Input
              id="display-name"
              value={settings.displayName}
              onChange={(e) => updateSettings({ displayName: e.target.value })}
              onBlur={() => setDisplayName(settings.displayName)}
            />
          </div>
          <div className="flex items-center justify-between gap-4 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2.5">
            <div>
              <p className="text-sm font-medium">Updates</p>
              <p className="text-xs text-[var(--color-muted)]">Check GitHub Releases for a new build</p>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={checkingUpdate}
              onClick={() => void onCheckUpdate()}
            >
              {checkingUpdate ? 'Checking…' : 'Check'}
            </Button>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
