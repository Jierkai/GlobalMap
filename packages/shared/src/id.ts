/**
 * 生成随机 id：`<prefix>-<随机串>`（设计文档 §6.4）。
 *
 * 随机段基于 crypto.getRandomValues（浏览器/Node 18+ 均可用），不依赖 Cesium。
 * 碰撞风险在单 map 场景可忽略；LayerManager.addLayer 的重复 id 抛错仍是兜底防线。
 */
export function generateId(prefix = 'gm'): string {
  const bytes = new Uint8Array(8)
  crypto.getRandomValues(bytes)
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
  return `${prefix}-${hex}`
}
