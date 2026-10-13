/** Excludes ambiguous characters: O, 0, I, 1, S, 5 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY2346789'

export const JOIN_CODE_PATTERN = /^[A-Z2-9]{3}-[A-Z2-9]{3}$/

function randomChar(): string {
  // CSPRNG when available (browser / Node crypto)
  const bytes = new Uint8Array(1)
  crypto.getRandomValues(bytes)
  const alphabetLen = JOIN_CODE_ALPHABET.length
  let b = bytes[0]!
  // Reject modulo bias
  while (b >= 256 - (256 % alphabetLen)) {
    crypto.getRandomValues(bytes)
    b = bytes[0]!
  }
  return JOIN_CODE_ALPHABET[b % alphabetLen] ?? 'A'
}

function randomSegment(length: number): string {
  let segment = ''
  for (let i = 0; i < length; i += 1) {
    segment += randomChar()
  }
  return segment
}

/** Client-side preview helper; authoritative codes come from `generate_join_code()` on the server. */
export function generateJoinCode(): string {
  return `${randomSegment(3)}-${randomSegment(3)}`
}

export function normalizeJoinCode(input: string): string {
  return input.trim().replace(/\s+/g, '').toUpperCase()
}

/** Returns null when the code is well-formed after normalization. */
export function validateJoinCode(input: string): string | null {
  const normalized = normalizeJoinCode(input)
  if (!JOIN_CODE_PATTERN.test(normalized)) {
    return 'Use a code like ABC-123 (letters and digits, with a dash).'
  }
  return null
}
