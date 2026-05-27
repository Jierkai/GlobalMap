export interface Disposable {
  dispose(): void;
}

export interface ScreenPoint {
  x: number;
  y: number;
}

export interface LngLat {
  lng: number;
  lat: number;
  alt?: number;
}

export interface CartesianPoint3D {
  x: number;
  y: number;
  z?: number;
}
