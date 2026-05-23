export interface Disposable {
  dispose(): void;
}

/** @deprecated Use `UpdatableHandle<TPatch>` from `../handle` instead. Kept for one release. */
export interface Updatable<TSpec = unknown> extends Disposable {
  update?(spec: TSpec): void;
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
