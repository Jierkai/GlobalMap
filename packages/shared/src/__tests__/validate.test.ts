import { describe, expect, it } from 'vitest'

import { assertNonEmptyId, isValidLatitude, isValidLongitude } from '../validate'

describe('isValidLongitude', () => {
  it('accepts -180 and 180', () => {
    expect(isValidLongitude(-180)).toBe(true)
    expect(isValidLongitude(180)).toBe(true)
  })

  it('accepts values within range', () => {
    expect(isValidLongitude(0)).toBe(true)
    expect(isValidLongitude(116.39)).toBe(true)
    expect(isValidLongitude(-73.98)).toBe(true)
  })

  it('rejects ±181', () => {
    expect(isValidLongitude(181)).toBe(false)
    expect(isValidLongitude(-181)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidLongitude(Number.NaN)).toBe(false)
  })
})

describe('isValidLatitude', () => {
  it('accepts -90 and 90', () => {
    expect(isValidLatitude(-90)).toBe(true)
    expect(isValidLatitude(90)).toBe(true)
  })

  it('accepts values within range', () => {
    expect(isValidLatitude(0)).toBe(true)
    expect(isValidLatitude(39.9)).toBe(true)
    expect(isValidLatitude(-33.87)).toBe(true)
  })

  it('rejects ±91', () => {
    expect(isValidLatitude(91)).toBe(false)
    expect(isValidLatitude(-91)).toBe(false)
  })

  it('rejects NaN', () => {
    expect(isValidLatitude(Number.NaN)).toBe(false)
  })
})

describe('assertNonEmptyId', () => {
  it('does not throw for non-empty string', () => {
    expect(() => assertNonEmptyId('layer-1')).not.toThrow()
  })

  it('throws for empty string with default name in message', () => {
    expect(() => assertNonEmptyId('')).toThrowError(/id/)
  })

  it('throws for empty string with custom name in message', () => {
    expect(() => assertNonEmptyId('', 'layerId')).toThrowError(/layerId/)
  })

  it('throws for whitespace-only string', () => {
    expect(() => assertNonEmptyId('   ')).toThrowError(/id/)
  })
})
