import { describe, expect, it } from 'vitest'

import { setCesiumBaseUrl } from '../cesium'

describe('setCesiumBaseUrl', () => {
  it('sets window.CESIUM_BASE_URL to the given url', () => {
    setCesiumBaseUrl('/cesium/')

    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe('/cesium/')
  })

  it('overrides the value on repeated calls', () => {
    setCesiumBaseUrl('/cesium-a/')
    setCesiumBaseUrl('/cesium-b/')

    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe('/cesium-b/')
  })

  it('passes a trailing-slash path through verbatim without normalization', () => {
    setCesiumBaseUrl('/static/cesium/')

    expect((window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL).toBe('/static/cesium/')
  })
})
