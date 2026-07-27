import { describe, it, expect } from 'vitest'
import { generateId } from '../id'

describe('generateId', () => {
  it('默认前缀为 gm-', () => {
    const id = generateId()
    expect(id.startsWith('gm-')).toBe(true)
  })

  it('自定义前缀透传', () => {
    expect(generateId('layer').startsWith('layer-')).toBe(true)
    expect(generateId('graphic').startsWith('graphic-')).toBe(true)
  })

  it('两次调用结果不同（随机性）', () => {
    const a = generateId()
    const b = generateId()
    expect(a).not.toBe(b)
  })

  it('返回值为非空字符串', () => {
    const id = generateId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan('gm-'.length)
  })
})
