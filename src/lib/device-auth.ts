import { useIdentityStore } from '@/stores/identity-store'

const EMAIL_DOMAIN = 'device.architecturecanvas.local'

export function getDeviceCredentials(): {
  installationId: string
  email: string
  password: string
  displayName: string
} {
  const identity = useIdentityStore.getState().ensureIdentity()
  const displayName =
    useIdentityStore.getState().settings.displayName || identity.displayName || 'Guest'
  const installationId = identity.installationId
  const email = `${installationId}@${EMAIL_DOMAIN}`
  // Deterministic local secret; not a human password. Bound to this installation.
  const password = `ac-${installationId}-v1-local-device-secret`
  return { installationId, email, password, displayName }
}
