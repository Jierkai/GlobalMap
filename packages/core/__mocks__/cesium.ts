import { vi } from 'vitest'

export class Viewer {
  container: string | HTMLElement
  options: Record<string, unknown>
  entities = { add: vi.fn(), remove: vi.fn() }
  scene = {}
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
