import { signal } from 'alien-signals';

export interface ImageryProvider {
  readonly ready: { (): boolean; (v: boolean): void };
  toCesium(): unknown;
}
