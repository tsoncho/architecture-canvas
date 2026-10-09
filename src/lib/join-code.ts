/** Excludes ambiguous characters: O, 0, I, 1, S, 5 */
export const JOIN_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRTUVWXY2346789'

function randomChar(): string {
  const index = Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)
  return JOIN_CODE_ALPHABET[index] ?? 'A'
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
