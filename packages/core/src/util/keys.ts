/**
 * 全局 Key 管理（图层域设计文档 §4.5）。
 *
 * 第三方图层（天地图 token、百度 AK、高德 key、Bing key 等）若未在图层 options
 * 中显式传入，则从全局 key 存储中读取对应厂商的 key。
 */

/** 全局 key 存储 */
const globalKeys: Record<string, string> = {}

/** 厂商标识 */
export type MapKeyProvider = 'tdt' | 'baidu' | 'amap' | 'google' | 'bing' | 'arcgis'

/**
 * 设置全局地图厂商 key（在 new Map3D 之前调用）。
 *
 * @param provider 厂商标识：'tdt' / 'baidu' / 'amap' / 'google' / 'bing' / 'arcgis'
 * @param key 对应厂商的 API key / token
 */
export function setMapKey(provider: MapKeyProvider, key: string): void {
  globalKeys[provider] = key
}

/**
 * 读取全局 key（图层 token 缺省时调用）。
 *
 * @param provider 厂商标识
 * @returns 全局 key，未设置时返回 undefined
 */
export function getMapKey(provider: MapKeyProvider): string | undefined {
  return globalKeys[provider]
}

/** 测试用：清空全部全局 key（不导出给消费者） */
export function _clearMapKeys(): void {
  for (const key of Object.keys(globalKeys)) {
    delete globalKeys[key]
  }
}
