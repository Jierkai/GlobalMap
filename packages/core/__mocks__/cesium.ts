import { vi } from 'vitest'

export class Viewer {
  container: string | HTMLElement
  options: Record<string, unknown>
  entities = { add: vi.fn(), remove: vi.fn() }
  scene = {}
  imageryLayers = {
    addImageryLayer: vi.fn((layer: unknown) => layer),
    addImageryProvider: vi.fn((provider: unknown) => new ImageryLayer(provider)),
    remove: vi.fn(),
    raise: vi.fn(),
    lower: vi.fn(),
    raiseToTop: vi.fn(),
    lowerToBottom: vi.fn(),
  }
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
