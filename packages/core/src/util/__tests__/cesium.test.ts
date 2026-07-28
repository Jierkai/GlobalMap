import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'

import { resolveCesiumBaseUrl } from '../cesium'

describe('resolveCesiumBaseUrl', () => {
  beforeEach(() => {
    delete (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL
    // 清除可能残留的 script 标签
    document.querySelectorAll('script').forEach((s) => s.remove())
  })

  afterEach(() => {
    vi.restoreAllMocks()
    delete (window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL
    document.querySelectorAll('script').forEach((s) => s.remove())
  })

  it('window.CESIUM_BASE_URL 已设时直接用（npm 依赖场景：打包器插件注入）', () => {
    ;(window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/custom/cesium'
    expect(resolveCesiumBaseUrl()).toBe('/custom/cesium')
  })

  it('全局未设但 script 标签含 Cesium.js 时推导目录（lib 场景）', () => {
    const script = document.createElement('script')
    script.src = '/lib/cesium/Cesium.js'
    document.head.appendChild(script)
    expect(resolveCesiumBaseUrl()).toBe('/lib/cesium')
  })

  it('script 标签 src 为绝对 URL 时推导目录', () => {
    const script = document.createElement('script')
    script.src = 'https://cdn.example.com/cesium/1.120/Cesium.js'
    document.head.appendChild(script)
    expect(resolveCesiumBaseUrl()).toBe('https://cdn.example.com/cesium/1.120')
  })

  it('全局未设且无 script 标签时回退 /cesium 并触发 console.warn', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const result = resolveCesiumBaseUrl()
    expect(result).toBe('/cesium')
    expect(warnSpy).toHaveBeenCalledTimes(1)
    // 警告信息引导装插件
    expect(warnSpy.mock.calls[0][0]).toMatch(/cesium|CESIUM_BASE_URL|插件|vite-plugin/i)
  })

  it('全局已设优先于 script 探测', () => {
    ;(window as { CESIUM_BASE_URL?: string }).CESIUM_BASE_URL = '/global/cesium'
    const script = document.createElement('script')
    script.src = '/lib/cesium/Cesium.js'
    document.head.appendChild(script)
    expect(resolveCesiumBaseUrl()).toBe('/global/cesium')
  })

  it('不匹配的 script 标签被跳过（src 不以 Cesium.js 结尾）', () => {
    const script = document.createElement('script')
    script.src = '/lib/app.js'
    document.head.appendChild(script)
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveCesiumBaseUrl()).toBe('/cesium')
    expect(warnSpy).toHaveBeenCalled()
  })
})
