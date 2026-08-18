import { vi } from 'vitest'

/** 有状态的 ImageryLayerCollection mock：维护真实堆叠顺序，供 zIndex / 图层组排序断言 */
function createImageryLayerCollection() {
  const stack: ImageryLayer[] = []
  return {
    /** 测试辅助：当前堆叠（底 -> 顶） */
    get _stack() {
      return stack
    },
    get length() {
      return stack.length
    },
    addImageryLayer: vi.fn((layer: ImageryLayer) => {
      stack.push(layer)
      return layer
    }),
    addImageryProvider: vi.fn((provider: unknown) => {
      const layer = new ImageryLayer(provider)
      stack.push(layer)
      return layer
    }),
    remove: vi.fn((layer: ImageryLayer) => {
      const i = stack.indexOf(layer)
      if (i !== -1) stack.splice(i, 1)
      return i !== -1
    }),
    indexOf: vi.fn((layer: ImageryLayer) => stack.indexOf(layer)),
    raise: vi.fn((layer: ImageryLayer) => {
      const i = stack.indexOf(layer)
      if (i !== -1 && i < stack.length - 1) {
        stack.splice(i, 1)
        stack.splice(i + 1, 0, layer)
      }
    }),
    lower: vi.fn((layer: ImageryLayer) => {
      const i = stack.indexOf(layer)
      if (i > 0) {
        stack.splice(i, 1)
        stack.splice(i - 1, 0, layer)
      }
    }),
    raiseToTop: vi.fn((layer: ImageryLayer) => {
      const i = stack.indexOf(layer)
      if (i !== -1) {
        stack.splice(i, 1)
        stack.push(layer)
      }
    }),
    lowerToBottom: vi.fn((layer: ImageryLayer) => {
      const i = stack.indexOf(layer)
      if (i !== -1) {
        stack.splice(i, 1)
        stack.unshift(layer)
      }
    }),
  }
}

export class Viewer {
  container: string | HTMLElement
  options: Record<string, unknown>
  entities = { add: vi.fn(), remove: vi.fn() }
  scene = { primitives: createPrimitiveCollection() }
  imageryLayers = createImageryLayerCollection()
  private _destroyed = false

  constructor(container: string | HTMLElement, options: Record<string, unknown> = {}) {
    this.container = container
    this.options = options
  }

  destroy(): void {
    this._destroyed = true
  }

  isDestroyed(): boolean {
    return this._destroyed
  }
}

export class Cartesian3 {
  x: number
  y: number
  z: number

  constructor(x = 0, y = 0, z = 0) {
    this.x = x
    this.y = y
    this.z = z
  }

  static fromDegrees(longitude: number, latitude: number, height = 0): Cartesian3 {
    return new Cartesian3(longitude, latitude, height)
  }
}

export class Cartesian2 {
  x: number
  y: number

  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }
}

export class Cartographic {
  longitude: number
  latitude: number
  height: number

  constructor(longitude = 0, latitude = 0, height = 0) {
    this.longitude = longitude
    this.latitude = latitude
    this.height = height
  }
}

export const Color = {
  RED: { red: 1, green: 0, blue: 0, alpha: 1 },
  GREEN: { red: 0, green: 1, blue: 0, alpha: 1 },
  BLUE: { red: 0, green: 0, blue: 1, alpha: 1 },
  WHITE: { red: 1, green: 1, blue: 1, alpha: 1 },
  BLACK: { red: 0, green: 0, blue: 0, alpha: 1 },
}

export function defined(value: unknown): boolean {
  return value !== undefined && value !== null
}

const CesiumMath = {
  toRadians(degrees: number): number {
    return (degrees * Math.PI) / 180
  },
  toDegrees(radians: number): number {
    return (radians * 180) / Math.PI
  },
}

export { CesiumMath as Math }

// -- 图层相关 mock --

export class UrlTemplateImageryProvider {
  url: string
  subdomains?: string | string[]
  maximumLevel?: number
  minimumLevel?: number
  tileWidth?: number
  tileHeight?: number
  credit?: string

  constructor(config: Record<string, unknown>) {
    this.url = config.url as string
    this.subdomains = config.subdomains as string | string[] | undefined
    this.maximumLevel = config.maximumLevel as number | undefined
    this.minimumLevel = config.minimumLevel as number | undefined
    this.tileWidth = config.tileWidth as number | undefined
    this.tileHeight = config.tileHeight as number | undefined
    this.credit = config.credit as string | undefined
  }
}

export class ImageryLayer {
  show = true
  alpha = 1.0
  brightness = 1.0
  contrast = 1.0
  hue = 0.0
  saturation = 1.0
  gamma = 1.0
  nightAlpha = 1.0
  dayAlpha = 1.0
  provider: unknown

  constructor(provider?: unknown) {
    this.provider = provider
  }
}

export class BingMapsImageryProvider {
  key?: string
  mapStyle?: string
  culture?: string

  static fromUrl = vi.fn().mockResolvedValue(new BingMapsImageryProvider())

  constructor(config?: Record<string, unknown>) {
    if (config) {
      this.key = config.key as string | undefined
      this.mapStyle = config.mapStyle as string | undefined
      this.culture = config.culture as string | undefined
    }
  }
}

export enum BingMapsStyle {
  AERIAL = 'Aerial',
  AERIAL_WITH_LABELS = 'AerialWithLabels',
  AERIAL_WITH_LABELS_ON_DEMAND = 'AerialWithLabelsOnDemand',
  ROAD = 'Road',
  ROAD_ON_DEMAND = 'RoadOnDemand',
  CANVAS_DARK = 'CanvasDark',
  CANVAS_LIGHT = 'CanvasLight',
  CANVAS_GRAY = 'CanvasGray',
  ORDNANCE_SURVEY = 'OrdnanceSurvey',
  COLLINS_BART = 'CollinsBart',
}

export class ArcGisMapServerImageryProvider {
  url?: string

  static fromUrl = vi.fn().mockResolvedValue(new ArcGisMapServerImageryProvider({}))

  constructor(config?: Record<string, unknown>) {
    if (config) {
      this.url = config.url as string | undefined
    }
  }
}

export class OpenStreetMapImageryProvider {
  url: string

  constructor(config: Record<string, unknown>) {
    this.url = config.url as string
  }
}

export class ProviderViewModel {
  name: string
  tooltip: string
  iconUrl: string
  creationFunction: () => unknown

  constructor(options: {
    name: string
    tooltip: string
    iconUrl: string
    creationFunction: () => unknown
  }) {
    this.name = options.name
    this.tooltip = options.tooltip
    this.iconUrl = options.iconUrl
    this.creationFunction = options.creationFunction
  }
}

export class Resource {
  url: string
  proxy?: unknown
  queryParameters?: Record<string, string>
  headers?: Record<string, string>

  constructor(options: Record<string, unknown> | string) {
    if (typeof options === 'string') {
      this.url = options
    } else {
      this.url = options.url as string
      this.proxy = options.proxy
      this.queryParameters = options.queryParameters as Record<string, string> | undefined
      this.headers = options.headers as Record<string, string> | undefined
    }
  }
}

export class DefaultProxy {
  proxy: string

  constructor(proxy: string) {
    this.proxy = proxy
  }
}

export class TilingScheme {
  ellipsoid = {}
  rectangle = {}
  projection = {}

  getNumberOfXTilesAtLevel(level: number): number {
    return Math.pow(2, level)
  }
  getNumberOfYTilesAtLevel(level: number): number {
    return Math.pow(2, level)
  }
  positionToTileXY(position: Cartographic, level: number, result?: Cartesian2): Cartesian2 {
    const x = Math.floor((position.longitude / (2 * Math.PI)) * Math.pow(2, level))
    const y = Math.floor((position.latitude / (2 * Math.PI)) * Math.pow(2, level))
    if (result) {
      result.x = x
      result.y = y
      return result
    }
    return new Cartesian2(x, y)
  }
}

// -- Primitive 系图元相关 mock（scene.primitives / Primitive / 几何与外观） --

/** 有状态的 PrimitiveCollection mock：维护 scene.primitives 挂载列表，供图元增删断言 */
function createPrimitiveCollection() {
  const items: unknown[] = []
  return {
    /** 测试辅助：当前挂载列表（底 -> 顶） */
    get _items() {
      return items
    },
    get length() {
      return items.length
    },
    add: vi.fn((primitive: unknown) => {
      items.push(primitive)
      return primitive
    }),
    remove: vi.fn((primitive: unknown) => {
      const i = items.indexOf(primitive)
      if (i !== -1) items.splice(i, 1)
      return i !== -1
    }),
    contains: vi.fn((primitive: unknown) => items.includes(primitive)),
    destroy: vi.fn(),
  }
}

export class PointPrimitiveCollection {
  show = true
  private _points: Record<string, unknown>[] = []
  private _destroyed = false

  /** 测试辅助：集合内的点 */
  get _all() {
    return this._points
  }

  get length() {
    return this._points.length
  }

  add = vi.fn((options: Record<string, unknown> = {}) => {
    const point = { show: true, ...options }
    this._points.push(point)
    return point
  })

  remove = vi.fn((point: unknown) => {
    const i = this._points.indexOf(point)
    if (i !== -1) this._points.splice(i, 1)
    return i !== -1
  })

  destroy(): void {
    this._destroyed = true
  }

  isDestroyed(): boolean {
    return this._destroyed
  }
}

export class Primitive {
  show: boolean
  geometryInstances?: unknown
  appearance?: unknown
  private _destroyed = false

  constructor(options: Record<string, unknown> = {}) {
    this.geometryInstances = options.geometryInstances
    this.appearance = options.appearance
    this.show = (options.show as boolean | undefined) ?? true
  }

  destroy(): void {
    this._destroyed = true
  }

  isDestroyed(): boolean {
    return this._destroyed
  }
}

export class GeometryInstance {
  geometry: unknown
  id?: unknown
  attributes?: Record<string, unknown>

  constructor(options: { geometry: unknown; id?: unknown; attributes?: Record<string, unknown> }) {
    this.geometry = options.geometry
    this.id = options.id
    this.attributes = options.attributes
  }
}

export class PolylineGeometry {
  positions: Cartesian3[]
  width?: number
  colors?: unknown[]

  constructor(options: { positions: Cartesian3[]; width?: number; colors?: unknown[] }) {
    this.positions = options.positions
    this.width = options.width
    this.colors = options.colors
  }
}

export class PolygonGeometry {
  positions?: Cartesian3[]
  height?: number
  extrudedHeight?: number

  constructor(options: Record<string, unknown> = {}) {
    this.positions = options.positions as Cartesian3[] | undefined
    this.height = options.height as number | undefined
    this.extrudedHeight = options.extrudedHeight as number | undefined
  }

  static fromPositions = vi.fn(
    (options: { positions: Cartesian3[]; height?: number; extrudedHeight?: number }) =>
      new PolygonGeometry(options),
  )
}

export class PerInstanceColorAppearance {
  options: Record<string, unknown>

  constructor(options: Record<string, unknown> = {}) {
    this.options = options
  }
}

export class PolylineColorAppearance {
  options: Record<string, unknown>

  constructor(options: Record<string, unknown> = {}) {
    this.options = options
  }
}

export class ColorGeometryInstanceAttribute {
  red: number
  green: number
  blue: number
  alpha: number

  constructor(red = 1, green = 1, blue = 1, alpha = 1) {
    this.red = red
    this.green = green
    this.blue = blue
    this.alpha = alpha
  }

  static fromColor = vi.fn(
    (color: { red: number; green: number; blue: number; alpha: number }) =>
      new ColorGeometryInstanceAttribute(color.red, color.green, color.blue, color.alpha),
  )
}
