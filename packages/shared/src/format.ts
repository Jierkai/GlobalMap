export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

export function formatArea(squareMeters: number): string {
  if (squareMeters < 1e6) {
    return `${Math.round(squareMeters)} m²`
  }
  return `${(squareMeters / 1e6).toFixed(2)} km²`
}

export function formatCoordinate(lon: number, lat: number, precision = 6): string {
  return `${lon.toFixed(precision)}, ${lat.toFixed(precision)}`
}
