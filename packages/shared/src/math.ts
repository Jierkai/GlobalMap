/**
 * Clamp a number to the [min, max] range.
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

/**
 * Linear interpolation from `from` to `to` by factor `t`.
 */
export function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/**
 * Convert degrees to radians.
 */
export function toRadians(degrees: number): number {
  return (degrees * Math.PI) / 180
}

/**
 * Convert radians to degrees.
 */
export function toDegrees(radians: number): number {
  return (radians * 180) / Math.PI
}
