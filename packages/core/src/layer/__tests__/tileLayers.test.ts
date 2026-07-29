import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Viewer, ImageryLayer, UrlTemplateImageryProvider } from 'cesium'
import { EventBus } from '../../event'
import { TdtLayer } from '../TdtLayer'
import { BaiduLayer } from '../BaiduLayer'
import { AmapLayer } from '../AmapLayer'
import { GoogleLayer } from '../GoogleLayer'
import { OsmLayer } from '../OsmLayer'
import { BingLayer } from '../BingLayer'
import { ArcGisLayer } from '../ArcGisLayer'
import { GraphicLayer } from '../GraphicLayer'
import { setMapKey, _clearMapKeys } from '../../util/keys'

vi.mock('cesium')

function makeViewer() {
  return new Viewer('div-id')
}

function makeEventBus() {
  return new EventBus()
}

/** 结构化擦除：测试中需访问 protected 成员，用接口声明为 public */
interface TestableLayer {
  _buildProviderConfig(): Record<string, unknown>
  _provider?: unknown
  _imageryLayer?: ImageryLayer
  _updateShow(show: boolean): void
  _bind(viewer: Viewer, eventBus: EventBus): void
  addToMap(): void
  removeFromMap(): void
  reload(): void
  setOpacity(opacity: number): void
  setOptions(options: Record<string, unknown>, isMerge?: boolean): void
  destroy(): void
  readonly state: string
  readonly isAdded: boolean
  readonly isDestroy: boolean
  readonly hasOpacity: boolean
  readonly hasZIndex: boolean
  readonly crs: string
  readonly imageryProvider: unknown
  readonly layer: unknown
  show: boolean
}

function bindAndAdd(layer: TestableLayer) {
  const viewer = makeViewer()
  const eventBus = makeEventBus()
  layer._bind(viewer, eventBus)
  layer.addToMap()
  return { viewer, eventBus }
}

beforeEach(() => {
  _clearMapKeys()
  vi.clearAllMocks()
})

describe('TdtLayer', () => {
  it('URL 模板正确（type 映射 img -> img_w）', () => {
    const layer = new TdtLayer({ token: 'test-tk', type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('T=img_w')
    expect(config.url).toContain('tk=test-tk')
    expect(config.url).toContain('t{s}.tianditu.gov.cn')
  })

  it('token 替换正确', () => {
    const layer = new TdtLayer({ token: 'my-token', type: 'vec' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('tk=my-token')
    expect(config.url).toContain('T=vec_w')
  })

  it('子域名 0-7', () => {
    const layer = new TdtLayer({ token: 'tk', type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.subdomains).toBe('01234567')
  })

  it('maximumLevel 默认 18', () => {
    const layer = new TdtLayer({ token: 'tk' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.maximumLevel).toBe(18)
  })

  it('credit 默认 Tianditu', () => {
    const layer = new TdtLayer({ token: 'tk' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.credit).toBe('Tianditu')
  })

  it('token 缺省时从全局 key 读取', () => {
    setMapKey('tdt', 'global-tdt-key')
    const layer = new TdtLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('tk=global-tdt-key')
  })

  it('addToMap 创建 provider + imageryLayer 并挂到 viewer.imageryLayers', () => {
    const layer = new TdtLayer({ token: 'tk', type: 'img' }) as unknown as TestableLayer
    const { viewer } = bindAndAdd(layer)
    expect(viewer.imageryLayers.addImageryProvider).toHaveBeenCalledTimes(1)
    expect(layer._provider).toBeInstanceOf(UrlTemplateImageryProvider)
  })

  it('removeFromMap 清理 imageryLayer', () => {
    const layer = new TdtLayer({ token: 'tk' }) as unknown as TestableLayer
    const { viewer } = bindAndAdd(layer)
    layer.removeFromMap()
    expect(viewer.imageryLayers.remove).toHaveBeenCalledTimes(1)
  })

  it('_updateShow 联动 imageryLayer.show', () => {
    const layer = new TdtLayer({ token: 'tk' }) as unknown as TestableLayer
    bindAndAdd(layer)
    layer._updateShow(false)
    expect((layer._imageryLayer as ImageryLayer).show).toBe(false)
  })

  it('type 为 tdt', () => {
    const layer = new TdtLayer({ token: 'tk' })
    expect(layer.type).toBe('tdt')
  })
})

describe('BaiduLayer', () => {
  it('影像 URL 模板正确', () => {
    const layer = new BaiduLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('shangetu{s}.map.bdimg.com')
  })

  it('矢量 URL 模板正确', () => {
    const layer = new BaiduLayer({ type: 'vec' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('online{s}.map.bdimg.com')
  })

  it('子域名 0-2', () => {
    const layer = new BaiduLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.subdomains).toBe('012')
  })

  it('maximumLevel 默认 19', () => {
    const layer = new BaiduLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.maximumLevel).toBe(19)
  })

  it('BaiduTilingScheme 注入到 tilingScheme', () => {
    const layer = new BaiduLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.tilingScheme).toBeDefined()
    expect(config.tilingScheme).toHaveProperty('type', 'baidu')
  })

  it('type 为 baidu', () => {
    const layer = new BaiduLayer()
    expect(layer.type).toBe('baidu')
  })

  it('addToMap 创建 provider 并挂载', () => {
    const layer = new BaiduLayer({ type: 'img' }) as unknown as TestableLayer
    const { viewer } = bindAndAdd(layer)
    expect(viewer.imageryLayers.addImageryProvider).toHaveBeenCalledTimes(1)
  })
})

describe('AmapLayer', () => {
  it('影像 URL 模板正确（style=6）', () => {
    const layer = new AmapLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('webst0{s}.is.autonavi.com')
    expect(config.url).toContain('style=6')
  })

  it('矢量 URL 模板正确（style=8）', () => {
    const layer = new AmapLayer({ type: 'vec' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('webrd0{s}.is.autonavi.com')
    expect(config.url).toContain('style=8')
  })

  it('子域名 1-4', () => {
    const layer = new AmapLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.subdomains).toBe('1234')
  })

  it('maximumLevel 默认 20', () => {
    const layer = new AmapLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.maximumLevel).toBe(20)
  })

  it('type 为 amap', () => {
    const layer = new AmapLayer()
    expect(layer.type).toBe('amap')
  })

  it('addToMap 创建 provider 并挂载', () => {
    const layer = new AmapLayer({ type: 'img' }) as unknown as TestableLayer
    const { viewer } = bindAndAdd(layer)
    expect(viewer.imageryLayers.addImageryProvider).toHaveBeenCalledTimes(1)
  })
})

describe('GoogleLayer', () => {
  it('影像 URL 模板正确（lyrs=s）', () => {
    const layer = new GoogleLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('mt{s}.google.com')
    expect(config.url).toContain('lyrs=s')
  })

  it('矢量 URL 模板正确（lyrs=m）', () => {
    const layer = new GoogleLayer({ type: 'vec' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('lyrs=m')
  })

  it('语言和区域参数', () => {
    const layer = new GoogleLayer({ type: 'img', language: 'en', region: 'US' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toContain('hl=en')
    expect(config.url).toContain('gl=US')
  })

  it('子域名 0-3', () => {
    const layer = new GoogleLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.subdomains).toBe('0123')
  })

  it('maximumLevel 默认 20', () => {
    const layer = new GoogleLayer({ type: 'img' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.maximumLevel).toBe(20)
  })

  it('type 为 google', () => {
    const layer = new GoogleLayer()
    expect(layer.type).toBe('google')
  })
})

describe('OsmLayer', () => {
  it('默认 URL 正确', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toBe('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png')
  })

  it('自定义 URL 透传', () => {
    const layer = new OsmLayer({ url: 'https://custom.tile.server/{z}/{x}/{y}.png' }) as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.url).toBe('https://custom.tile.server/{z}/{x}/{y}.png')
  })

  it('子域名 a/b/c', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.subdomains).toEqual(['a', 'b', 'c'])
  })

  it('maximumLevel 默认 19', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.maximumLevel).toBe(19)
  })

  it('credit 默认 OpenStreetMap contributors', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    const config = layer._buildProviderConfig()
    expect(config.credit).toBe('OpenStreetMap contributors')
  })

  it('type 为 osm', () => {
    const layer = new OsmLayer()
    expect(layer.type).toBe('osm')
  })

  it('addToMap 创建 provider 并挂载', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    const { viewer } = bindAndAdd(layer)
    expect(viewer.imageryLayers.addImageryProvider).toHaveBeenCalledTimes(1)
  })
})

describe('BingLayer', () => {
  it('构造 BingMapsImageryProvider（fromUrl 异步）', async () => {
    const layer = new BingLayer({ key: 'test-key', type: 'aerial' }) as unknown as TestableLayer
    bindAndAdd(layer)
    await vi.waitFor(() => {
      expect(layer._provider).toBeDefined()
    })
  })

  it('key 传入', async () => {
    const layer = new BingLayer({ key: 'my-bing-key' }) as unknown as TestableLayer
    bindAndAdd(layer)
    await vi.waitFor(() => {
      expect(layer._provider).toBeDefined()
    })
  })

  it('type 映射：aerial', () => {
    const layer = new BingLayer({ key: 'k', type: 'aerial' })
    expect(layer.layerType).toBe('aerial')
  })

  it('type 映射：road', () => {
    const layer = new BingLayer({ key: 'k', type: 'road' })
    expect(layer.layerType).toBe('road')
  })

  it('type 为 bing', () => {
    const layer = new BingLayer({ key: 'k' })
    expect(layer.type).toBe('bing')
  })

  it('key 缺省时从全局 key 读取', async () => {
    setMapKey('bing', 'global-bing-key')
    const layer = new BingLayer({ type: 'aerial' }) as unknown as TestableLayer
    bindAndAdd(layer)
    await vi.waitFor(() => {
      expect(layer._provider).toBeDefined()
    })
  })
})

describe('ArcGisLayer', () => {
  it('useTileTemplate=true 同步模式', () => {
    const layer = new ArcGisLayer({
      url: 'https://example.com/MapServer',
      useTileTemplate: true,
      maximumLevel: 18,
    }) as unknown as TestableLayer
    bindAndAdd(layer)
    expect(layer._provider).toBeInstanceOf(UrlTemplateImageryProvider)
    expect((layer._provider as UrlTemplateImageryProvider).url).toContain('/tile/{z}/{y}/{x}')
  })

  it('useTileTemplate=false（默认）走 fromUrl 异步', async () => {
    const layer = new ArcGisLayer({
      url: 'https://example.com/MapServer',
    }) as unknown as TestableLayer
    bindAndAdd(layer)
    await vi.waitFor(() => {
      expect(layer._provider).toBeDefined()
    })
  })

  it('type 为 arcgis', () => {
    const layer = new ArcGisLayer({ url: 'https://example.com' })
    expect(layer.type).toBe('arcgis')
  })
})

// ============================================================
// Getter / 实例方法 通用测试（以 OsmLayer 为代表）
// ============================================================

describe('图层 Getter（以 OsmLayer 为代表）', () => {
  it('hasOpacity = true（瓦片图层）', () => {
    const layer = new OsmLayer()
    expect(layer.hasOpacity).toBe(true)
  })

  it('hasZIndex = true（瓦片图层）', () => {
    const layer = new OsmLayer()
    expect(layer.hasZIndex).toBe(true)
  })

  it('crs = WGS84（OSM 默认）', () => {
    const layer = new OsmLayer()
    expect(layer.crs).toBe('WGS84')
  })

  it('state 初始为 INITIAL', () => {
    const layer = new OsmLayer()
    expect(layer.state).toBe('initial')
  })

  it('isAdded = false（未 addLayer）', () => {
    const layer = new OsmLayer()
    expect(layer.isAdded).toBe(false)
  })

  it('isDestroy = false（未销毁）', () => {
    const layer = new OsmLayer()
    expect(layer.isDestroy).toBe(false)
  })

  it('imageryProvider = undefined（未 addToMap）', () => {
    const layer = new OsmLayer()
    expect(layer.imageryProvider).toBeUndefined()
  })

  it('layer = undefined（未 addToMap）', () => {
    const layer = new OsmLayer()
    expect(layer.layer).toBeUndefined()
  })

  it('addToMap 后 state = ADDED，isAdded = true', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    bindAndAdd(layer)
    expect(layer.state).toBe('added')
    expect(layer.isAdded).toBe(true)
  })

  it('addToMap 后 imageryProvider / layer 有值', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    bindAndAdd(layer)
    expect(layer.imageryProvider).toBeDefined()
    expect(layer.layer).toBeDefined()
  })

  it('removeFromMap 后 state = REMOVED，isAdded = false', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    bindAndAdd(layer)
    layer.removeFromMap()
    expect(layer.state).toBe('removed')
    expect(layer.isAdded).toBe(false)
  })

  it('destroy 后 state = DESTROYED，isDestroy = true', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    bindAndAdd(layer)
    layer.destroy()
    expect(layer.state).toBe('destroyed')
    expect(layer.isDestroy).toBe(true)
  })
})

describe('crs getter 各厂商', () => {
  it('TdtLayer crs = WGS84', () => {
    const layer = new TdtLayer({ token: 'tk' })
    expect(layer.crs).toBe('WGS84')
  })

  it('BaiduLayer crs = BD09', () => {
    const layer = new BaiduLayer({ type: 'img' })
    expect(layer.crs).toBe('BD09')
  })

  it('AmapLayer crs = GCJ02', () => {
    const layer = new AmapLayer({ type: 'img' })
    expect(layer.crs).toBe('GCJ02')
  })

  it('GoogleLayer crs = WGS84', () => {
    const layer = new GoogleLayer({ type: 'img' })
    expect(layer.crs).toBe('WGS84')
  })

  it('BingLayer crs = WGS84', () => {
    const layer = new BingLayer({ key: 'k' })
    expect(layer.crs).toBe('WGS84')
  })

  it('ArcGisLayer crs = WGS84', () => {
    const layer = new ArcGisLayer({ url: 'https://example.com' })
    expect(layer.crs).toBe('WGS84')
  })
})

describe('reload()', () => {
  it('reload 重新创建 provider + imageryLayer', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    const { viewer } = bindAndAdd(layer)
    const oldProvider = layer._provider
    const mockAdd = viewer.imageryLayers.addImageryProvider as unknown as { mockClear: () => void }
    mockAdd.mockClear()
    layer.reload()
    expect(viewer.imageryLayers.addImageryProvider).toHaveBeenCalledTimes(1)
    expect(layer._provider).toBeDefined()
    expect(layer._provider).not.toBe(oldProvider)
  })

  it('reload 后 state = ADDED', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    bindAndAdd(layer)
    layer.reload()
    expect(layer.state).toBe('added')
  })

  it('未绑定时 reload 抛错', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    expect(() => layer.reload()).toThrow(/bind|绑定/i)
  })
})

describe('setOpacity()', () => {
  it('setOpacity 设置透明度并同步到 ImageryLayer', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    bindAndAdd(layer)
    layer.setOpacity(0.5)
    expect((layer._imageryLayer as ImageryLayer).alpha).toBe(0.5)
  })

  it('setOpacity 在 addToMap 前调用不报错（存值，addToMap 后同步）', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    expect(() => layer.setOpacity(0.3)).not.toThrow()
  })

  it('addToMap 后 setOpacity 同步到 ImageryLayer', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    layer.setOpacity(0.3)
    bindAndAdd(layer)
    expect((layer._imageryLayer as ImageryLayer).alpha).toBe(1.0) // addToMap 时 alpha 默认 1.0（_applyVisualProperties 只在 options.alpha 有值时覆盖）
    layer.setOpacity(0.3) // 再次调用同步
    expect((layer._imageryLayer as ImageryLayer).alpha).toBe(0.3)
  })
})

describe('setOptions()', () => {
  it('setOptions 替换模式（isMerge=false）', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    layer.setOptions({ show: false })
    expect(layer.show).toBe(false)
  })

  it('setOptions 合并模式（isMerge=true）', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    layer.setOptions({ show: false }, true)
    expect(layer.show).toBe(false)
  })

  it('setOptions 后 show 字段同步', () => {
    const layer = new OsmLayer() as unknown as TestableLayer
    layer.setOptions({ show: true })
    expect(layer.show).toBe(true)
    layer.setOptions({ show: false })
    expect(layer.show).toBe(false)
  })
})

describe('GraphicLayer hasOpacity/hasZIndex', () => {
  it('hasOpacity = false', () => {
    const layer = new GraphicLayer({ id: 'gl-1' })
    expect(layer.hasOpacity).toBe(false)
  })

  it('hasZIndex = false', () => {
    const layer = new GraphicLayer({ id: 'gl-1' })
    expect(layer.hasZIndex).toBe(false)
  })
})
