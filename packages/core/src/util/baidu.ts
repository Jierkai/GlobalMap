import { TilingScheme, Cartographic, Cartesian2 } from 'cesium'
import { bd09ToWgs84 } from './coordTransform'

/**
 * 百度瓦片坐标转换方案（图层域设计文档 §4.6）。
 *
 * 百度瓦片使用 BD09 坐标系 + 自有瓦片编号体系（非标准 TMS/Google）。
 * 本类继承 Cesium.TilingScheme，覆写坐标转换方法，
 * 实现标准 TMS 坐标 <-> 百度瓦片坐标的转换。
 *
 * 百度墨卡托投影：将 BD09 经纬度转为百度墨卡托坐标（米），
 * 再按 256px 瓦片切分。投影参数与 Web 墨卡托不同（百度使用自定义椭球）。
 */

const EARTH_HALF_CIRCUM = 20037508.34

/**
 * 百度坐标转墨卡托（BD09 经纬度 -> 墨卡托坐标）。
 * 先 BD09 -> WGS84，再用 Web 墨卡托投影近似。
 */
function bd09ToMc(lng: number, lat: number): [number, number] {
  const [wgsLng, wgsLat] = bd09ToWgs84(lng, lat)
  const x = (wgsLng * EARTH_HALF_CIRCUM) / 180
  let y = Math.log(Math.tan(((90 + wgsLat) * Math.PI) / 360)) / (Math.PI / 180)
  y = (y * EARTH_HALF_CIRCUM) / 180
  return [x, y]
}

/**
 * 百度瓦片坐标转换方案。
 *
 * 继承 Cesium.TilingScheme，覆写 positionToTileXY，
 * 将 Cesium 的标准 TMS 坐标转换为百度瓦片编号。
 *
 * 百度瓦片编号规则：
 * - 原点在左下角（与 TMS 一致）
 * - 百度 y 轴翻转：百度 y = (2^z - 1) - tms_y
 */
export class BaiduTilingScheme extends TilingScheme {
  readonly type = 'baidu'

  constructor() {
    super()
  }

  /**
   * 将地理坐标（Cartographic，弧度）转为百度瓦片坐标。
   * Cesium 内部调用此方法确定某个位置落在哪个瓦片上。
   *
   * 注：Cartographic 经纬度为弧度，需先转度再 BD09 偏移。
   */
  positionToTileXY(position: Cartographic, level: number, result?: Cartesian2): Cartesian2 {
    const lngDeg = (position.longitude * 180) / Math.PI
    const latDeg = (position.latitude * 180) / Math.PI
    // WGS84 -> BD09 墨卡托
    const [mcX, mcY] = bd09ToMc(lngDeg, latDeg)
    // 墨卡托坐标 -> 瓦片编号
    const tileSize = (EARTH_HALF_CIRCUM * 2) / Math.pow(2, level)
    const x = Math.floor((mcX + EARTH_HALF_CIRCUM) / tileSize)
    const tmsY = Math.floor((EARTH_HALF_CIRCUM - mcY) / tileSize)
    // 百度 y 轴翻转
    const baiduY = Math.pow(2, level) - 1 - tmsY
    if (result) {
      result.x = x
      result.y = baiduY
      return result
    }
    return new Cartesian2(x, baiduY)
  }
}
