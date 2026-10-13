import { describe, expect, it } from 'vitest'
import {
  generateJoinCode,
  JOIN_CODE_PATTERN,
  normalizeJoinCode,
  validateJoinCode,
} from './join-code'

describe('join codes', () => {
  it('normalizes whitespace and case', () => {
    expect(normalizeJoinCode('  ab1-cd2  ')).toBe('AB1-CD2')
  })

  it('validates format', () => {
    expect(validateJoinCode('ABC-234')).toBeNull()
    expect(validateJoinCode('bad')).not.toBeNull()
    expect(validateJoinCode('OOOOOO')).not.toBeNull()
  })

  it('generates codes that match the server pattern', () => {
    for (let i = 0; i < 20; i += 1) {
      expect(JOIN_CODE_PATTERN.test(generateJoinCode())).toBe(true)
    }
  })
})
