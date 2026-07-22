export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
