import type { StyleSystem } from '../style/StyleRule.js';

export interface Identified {
  readonly id: string;
  name?: string;
  readonly properties: Record<string, unknown>;
}

export interface Positionable {
  readonly position: { (): unknown; (v: unknown): void };
}

export interface MultiPositionable {
  readonly positions: { (): unknown[]; (v: unknown[]): void };
}

export interface Styleable<S> {
  readonly style: StyleSystem<S>;
}

export interface Pickable {
  pickable: { (): boolean; (v: boolean): void };
}

export interface Hoverable {
  hoverable: { (): boolean; (v: boolean): void };
}

export interface Highlightable {
  readonly highlighted: { (): boolean; (v: boolean): void };
  highlight(): void;
  unhighlight(): void;
}

export interface GeoJsonSerializable {
  toGeoJSON(): Record<string, unknown>;
}
