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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useIdentityStore } from '@/stores/identity-store'

type SettingsDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAppearanceChange: (appearance: 'system' | 'light' | 'dark') => void
}

export function SettingsDialog({ open, onOpenChange, onAppearanceChange }: SettingsDialogProps) {
  const settings = useIdentityStore((s) => s.settings)
  const updateSettings = useIdentityStore((s) => s.updateSettings)
  const setDisplayName = useIdentityStore((s) => s.setDisplayName)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border border-[var(--color-border)] dark:border-[var(--color-border-dark)]">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
          <DialogDescription>Appearance and editor preferences.</DialogDescription>
        </DialogHeader>
        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <Label>Appearance</Label>
            <Select
              value={settings.appearance}
              onValueChange={(v) => {
                const appearance = v as 'system' | 'light' | 'dark'
                updateSettings({ appearance })
                onAppearanceChange(appearance)
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
          </div>
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
