export interface Rectangle {
  west: number;
  south: number;
  east: number;
  north: number;
}

export interface Cartesian2 {
  x: number;
  y: number;
}

export interface Cartographic {
  longitude: number;
  latitude: number;
  height?: number;
}

export interface ProjectionLike {
  project(position: Cartographic): { x: number; y: number; z?: number };
  unproject(point: { x: number; y: number; z?: number }): Cartographic;
}
