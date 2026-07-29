import type { BasemapItem } from '../type'
import { LayerType, BingLayerType } from '../type'

/**
 * 内置底图预设工厂（图层域设计文档 §4.3.3）。
 *
 * 返回 BasemapItem（`{ type, options, name?, iconUrl?, tooltip? }`），
 * 与 layer 配置项结构一致，可直接传入 Map3DOptions.basemapsLayer。
 */
export const basemaps = {
  /** 天地图卫星影像 */
  tdtImagery: (token: string): BasemapItem => ({
    type: 'tdt',
    options: { token, type: LayerType.IMG },
    name: '天地图影像',
  }),

  /** 天地图矢量底图 */
  tdtVector: (token: string): BasemapItem => ({
    type: 'tdt',
    options: { token, type: LayerType.VEC },
    name: '天地图矢量',
  }),

  /** ArcGIS World Imagery */
  arcgisImagery: (): BasemapItem => ({
    type: 'arcgis',
    options: {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 18,
    },
    name: 'ArcGIS World Imagery',
  }),

  /** OpenStreetMap */
  osm: (): BasemapItem => ({
    type: 'osm',
    options: {},
    name: 'OpenStreetMap',
  }),

  /** 谷歌卫星影像 */
  googleImagery: (): BasemapItem => ({
    type: 'google',
    options: { type: LayerType.IMG },
    name: '谷歌影像',
  }),

  /** 高德卫星影像 */
  amapImagery: (): BasemapItem => ({
    type: 'amap',
    options: { type: LayerType.IMG },
    name: '高德影像',
  }),

  /** 百度卫星影像 */
  baiduImagery: (ak?: string): BasemapItem => ({
    type: 'baidu',
    options: { ak, type: LayerType.IMG },
    name: '百度影像',
  }),

  /** Bing Maps 卫星影像 */
  bingImagery: (key: string): BasemapItem => ({
    type: 'bing',
    options: { key, type: BingLayerType.AERIAL },
    name: 'Bing 影像',
  }),
}
