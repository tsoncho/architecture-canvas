/** Shared resource limits for Architecture Spec + canvas fields. */
export const SPEC_LIMITS = {
  maxJsonBytes: 1_500_000,
  maxNodes: 300,
  maxEdges: 500,
  maxIdLength: 64,
  maxNameLength: 120,
  maxTechnologyLength: 120,
  maxDescriptionLength: 4000,
  maxLabelLength: 120,
  maxProjectNameLength: 120,
  supportedVersions: [1] as const,
} as const

export type SupportedSpecVersion = (typeof SPEC_LIMITS.supportedVersions)[number]
