import { useIdentityStore } from '@/stores/identity-store'
import type { LocalIdentity } from '@/types'

const EMAIL_DOMAIN = 'device.architecturecanvas.local'

function legacyDevicePassword(installationId: string): string {
  // Pre-v0.1.13 installs used a deterministic secret. Keep for sign-in continuity.
  return `ac-${installationId}-v1-local-device-secret`
}

/** Ensure identity has a persisted deviceSecret without breaking existing cloud users. */
export function ensureDeviceSecret(identity: LocalIdentity): LocalIdentity {
  if (identity.deviceSecret && identity.deviceSecret.length >= 16) {
    return identity
  }
  const next: LocalIdentity = {
    ...identity,
    // Existing installs already registered with the legacy password — preserve it.
    deviceSecret: legacyDevicePassword(identity.installationId),
  }
  useIdentityStore.getState().persistIdentity(next)
  return next
}

export function getDeviceCredentials(): {
  installationId: string
  email: string
  password: string
  displayName: string
} {
  let identity = useIdentityStore.getState().ensureIdentity()
  // Brand-new installs get a random secret at creation time; older ones migrate via ensureDeviceSecret.
  if (!identity.deviceSecret) {
    identity = ensureDeviceSecret(identity)
  }
  const displayName =
    useIdentityStore.getState().settings.displayName || identity.displayName || 'Guest'
  const installationId = identity.installationId
  const email = `${installationId}@${EMAIL_DOMAIN}`
  const password = identity.deviceSecret ?? legacyDevicePassword(installationId)
  return { installationId, email, password, displayName }
}
