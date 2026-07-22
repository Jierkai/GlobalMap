import { describe, expect, it } from 'vitest'

import { clamp, lerp, toDegrees, toRadians } from '../math'

describe('clamp', () => {
  it('returns value when within range', () => {
    expect(clamp(5, 0, 10)).toBe(5)
  })

  it('returns min when value is below min', () => {
    expect(clamp(-5, 0, 10)).toBe(0)
  })

  it('returns max when value is above max', () => {
    expect(clamp(15, 0, 10)).toBe(10)
  })

  it('handles value equal to boundaries', () => {
    expect(clamp(0, 0, 10)).toBe(0)
    expect(clamp(10, 0, 10)).toBe(10)
  })
})

describe('lerp', () => {
  it('returns from when t is 0', () => {
    expect(lerp(10, 20, 0)).toBe(10)
  })

  it('returns to when t is 1', () => {
    expect(lerp(10, 20, 1)).toBe(20)
  })

  it('returns midpoint when t is 0.5', () => {
    expect(lerp(10, 20, 0.5)).toBe(15)
  })
})

describe('toRadians', () => {
  it('converts 0 degrees to 0 radians', () => {
    expect(toRadians(0)).toBe(0)
  })

  it('converts 180 degrees to PI radians', () => {
    expect(toRadians(180)).toBe(Math.PI)
  })

  it('converts 90 degrees to PI/2 radians', () => {
    expect(toRadians(90)).toBeCloseTo(Math.PI / 2, 10)
  })
})

describe('toDegrees', () => {
  it('converts 0 radians to 0 degrees', () => {
    expect(toDegrees(0)).toBe(0)
  })

  it('converts PI radians to 180 degrees', () => {
    expect(toDegrees(Math.PI)).toBe(180)
  })

  it('converts PI/2 radians to 90 degrees', () => {
    expect(toDegrees(Math.PI / 2)).toBeCloseTo(90, 10)
  })
})
