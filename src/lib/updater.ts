import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'
import { toast } from '@/stores/toast-store'

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Check GitHub Releases for a signed update.
 * Returns status; may relaunch the app when an update installs.
 */
export async function checkForAppUpdate(options?: {
  quiet?: boolean
}): Promise<'updated' | 'up-to-date' | 'skipped' | 'error'> {
  if (!isTauriRuntime()) return 'skipped'
  const quiet = options?.quiet ?? false

  try {
    if (!quiet) toast('Checking for updates…', 'info')
    const update = await check()
    if (!update) {
      if (!quiet) toast('You’re on the latest version')
      return 'up-to-date'
    }

    toast(`Downloading update ${update.version}…`, 'info')
    await update.downloadAndInstall()
    toast('Update installed — restarting…', 'info')
    await relaunch()
    return 'updated'
  } catch {
    if (!quiet) toast('Could not check for updates.', 'error')
    return 'error'
  }
}
