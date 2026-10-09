import { check } from '@tauri-apps/plugin-updater'
import { relaunch } from '@tauri-apps/plugin-process'

function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

/**
 * Quietly check GitHub Releases for a signed update.
 * Returns true if an update was installed (app will relaunch).
 */
export async function checkForAppUpdate(): Promise<'updated' | 'up-to-date' | 'skipped' | 'error'> {
  if (!isTauriRuntime()) return 'skipped'

  try {
    const update = await check()
    if (!update) return 'up-to-date'

    await update.downloadAndInstall()
    await relaunch()
    return 'updated'
  } catch {
    return 'error'
  }
}
