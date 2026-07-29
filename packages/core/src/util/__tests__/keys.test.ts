import { describe, it, expect, beforeEach } from 'vitest'
import { setMapKey, getMapKey, _clearMapKeys } from '../keys'

beforeEach(() => {
  _clearMapKeys()
})

describe('全局 Key 管理', () => {
  it('setMapKey / getMapKey 基本存取', () => {
    setMapKey('tdt', 'my-tianditu-token')
    expect(getMapKey('tdt')).toBe('my-tianditu-token')
  })

  it('未设置的 key 返回 undefined', () => {
    expect(getMapKey('baidu')).toBeUndefined()
  })

  it('多个厂商 key 共存', () => {
    setMapKey('tdt', 'token-1')
    setMapKey('bing', 'key-2')
    setMapKey('amap', 'key-3')
    expect(getMapKey('tdt')).toBe('token-1')
    expect(getMapKey('bing')).toBe('key-2')
    expect(getMapKey('amap')).toBe('key-3')
  })

  it('同一厂商 key 覆盖更新', () => {
    setMapKey('tdt', 'old-token')
    setMapKey('tdt', 'new-token')
    expect(getMapKey('tdt')).toBe('new-token')
  })

  it('_clearMapKeys 清空全部 key', () => {
    setMapKey('tdt', 'token')
    setMapKey('bing', 'key')
    _clearMapKeys()
    expect(getMapKey('tdt')).toBeUndefined()
    expect(getMapKey('bing')).toBeUndefined()
  })
})
