import { describe, it, expect } from 'vitest'
import {
  gcj02ToWgs84,
  wgs84ToGcj02,
  bd09ToGcj02,
  gcj02ToBd09,
  bd09ToWgs84,
  wgs84ToBd09,
} from '../coordTransform'

describe('坐标转换工具函数', () => {
  // 测试数据：北京天安门坐标
  // WGS84: 116.397456, 39.908823
  // GCJ02: 116.403611, 39.910024
  // BD09:  116.410244, 39.916015

  describe('gcj02ToWgs84', () => {
    it('中国境内坐标偏移正确', () => {
      const [lng, lat] = gcj02ToWgs84(116.403611, 39.910024)
      expect(lng).toBeCloseTo(116.397456, 3)
      expect(lat).toBeCloseTo(39.908823, 3)
    })

    it('海外坐标不偏移', () => {
      const [lng, lat] = gcj02ToWgs84(-74.006, 40.7128) // 纽约
      expect(lng).toBe(-74.006)
      expect(lat).toBe(40.7128)
    })
  })

  describe('wgs84ToGcj02', () => {
    it('中国境内坐标偏移正确', () => {
      const [lng, lat] = wgs84ToGcj02(116.397456, 39.908823)
      expect(lng).toBeCloseTo(116.403611, 3)
      expect(lat).toBeCloseTo(39.910024, 3)
    })

    it('海外坐标不偏移', () => {
      const [lng, lat] = wgs84ToGcj02(-74.006, 40.7128)
      expect(lng).toBe(-74.006)
      expect(lat).toBe(40.7128)
    })
  })

  describe('bd09ToGcj02', () => {
    it('BD09 -> GCJ02 偏移正确', () => {
      const [lng, lat] = bd09ToGcj02(116.410244, 39.916015)
      expect(lng).toBeCloseTo(116.403611, 3)
      expect(lat).toBeCloseTo(39.910024, 3)
    })
  })

  describe('gcj02ToBd09', () => {
    it('GCJ02 -> BD09 偏移正确', () => {
      const [lng, lat] = gcj02ToBd09(116.403611, 39.910024)
      expect(lng).toBeCloseTo(116.410244, 3)
      expect(lat).toBeCloseTo(39.916015, 3)
    })
  })

  describe('bd09ToWgs84', () => {
    it('BD09 -> WGS84 偏移正确', () => {
      const [lng, lat] = bd09ToWgs84(116.410244, 39.916015)
      expect(lng).toBeCloseTo(116.397456, 2)
      expect(lat).toBeCloseTo(39.908823, 2)
    })
  })

  describe('wgs84ToBd09', () => {
    it('WGS84 -> BD09 偏移正确', () => {
      const [lng, lat] = wgs84ToBd09(116.397456, 39.908823)
      expect(lng).toBeCloseTo(116.410244, 2)
      expect(lat).toBeCloseTo(39.916015, 2)
    })
  })

  describe('往返转换一致性', () => {
    it('wgs84 -> gcj02 -> wgs84 近似还原', () => {
      const [gcjLng, gcjLat] = wgs84ToGcj02(116.397456, 39.908823)
      const [wgsLng, wgsLat] = gcj02ToWgs84(gcjLng, gcjLat)
      expect(wgsLng).toBeCloseTo(116.397456, 4)
      expect(wgsLat).toBeCloseTo(39.908823, 4)
    })

    it('bd09 -> gcj02 -> bd09 近似还原', () => {
      const [gcjLng, gcjLat] = bd09ToGcj02(116.410244, 39.916015)
      const [bdLng, bdLat] = gcj02ToBd09(gcjLng, gcjLat)
      expect(bdLng).toBeCloseTo(116.410244, 4)
      expect(bdLat).toBeCloseTo(39.916015, 4)
    })
  })
})
