import { describe, it, expect } from 'vitest';
import * as Cesium from 'cesium';
import { resolveProvider } from '../../src/handles/_provider';

describe('resolveProvider', () => {
  it('passes through native Cesium providers unchanged', () => {
    const native = new Cesium.UrlTemplateImageryProvider({ url: 'x/{z}/{x}/{y}' });
    expect(resolveProvider(native)).toBe(native);
  });

  it('builds a UrlTemplateImageryProvider from xyz spec', () => {
    const result = resolveProvider({ type: 'xyz', url: 'a/{z}/{x}/{y}' });
    expect(result).toBeInstanceOf(Cesium.UrlTemplateImageryProvider);
  });

  it('unwraps wrapper objects via raw()', () => {
    const native = new Cesium.UrlTemplateImageryProvider({ url: 'b/{z}/{x}/{y}' });
    const wrapper = { raw: () => native };
    expect(resolveProvider(wrapper)).toBe(native);
  });
});
