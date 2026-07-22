export function isValidLongitude(v: number): boolean {
  return Number.isFinite(v) && v >= -180 && v <= 180
}

export function isValidLatitude(v: number): boolean {
  return Number.isFinite(v) && v >= -90 && v <= 90
}

export function assertNonEmptyId(id: string, name = 'id'): void {
  if (id.trim().length === 0) {
    throw new Error(`${name} must be a non-empty string`)
  }
}
