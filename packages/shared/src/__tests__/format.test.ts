import { describe, expect, it } from 'vitest'

import { formatArea, formatCoordinate, formatDistance } from '../format'

describe('formatDistance', () => {
  it('formats meters below 1000 as m', () => {
    expect(formatDistance(999)).toBe('999 m')
  })

  it('formats 1000 meters as km', () => {
    expect(formatDistance(1000)).toBe('1.00 km')
  })

  it('formats larger values as km with 2 decimals', () => {
    expect(formatDistance(1500)).toBe('1.50 km')
    expect(formatDistance(12345)).toBe('12.35 km')
  })

  it('formats small meters without decimals', () => {
    expect(formatDistance(0)).toBe('0 m')
    expect(formatDistance(500.4)).toBe('500 m')
  })
})

describe('formatArea', () => {
  it('formats square meters below 1e6 as m²', () => {
    expect(formatArea(999999)).toBe('999999 m²')
  })

  it('formats 1e6 as km²', () => {
    expect(formatArea(1_000_000)).toBe('1.00 km²')
  })

  it('formats larger values as km² with 2 decimals', () => {
    expect(formatArea(2_500_000)).toBe('2.50 km²')
  })

  it('formats small areas without decimals', () => {
    expect(formatArea(0)).toBe('0 m²')
    expect(formatArea(500.6)).toBe('501 m²')
  })
})

describe('formatCoordinate', () => {
  it('formats with default precision 6', () => {
    expect(formatCoordinate(116.3912345678, 39.9045678912)).toBe('116.391235, 39.904568')
  })

  it('respects custom precision', () => {
    expect(formatCoordinate(116.3912345678, 39.9045678912, 2)).toBe('116.39, 39.90')
  })

  it('handles negative coordinates', () => {
    expect(formatCoordinate(-73.9857, 40.7484, 4)).toBe('-73.9857, 40.7484')
  })

  it('handles zero precision', () => {
    expect(formatCoordinate(116.5, 39.5, 0)).toBe('117, 40')
  })
})
