import { describe, it, expect } from 'vitest';
import * as Cesium from 'cesium';
import { createXYZImageryProvider, createWMSImageryProvider, createTerrainProvider } from '../src/provider';

describe('ProviderBridge', () => {
  it('should create XYZ imagery provider', () => {
    const provider = createXYZImageryProvider({ url: 'http://test.xyz/{z}/{x}/{y}.png' });
    expect(provider).toBeDefined();
    expect((provider as any).url).toBe('http://test.xyz/{z}/{x}/{y}.png');
  });

  it('should create WMS imagery provider', () => {
    const provider = createWMSImageryProvider({ url: 'http://test.wms/', layers: 'layer1' });
    expect(provider).toBeDefined();
    expect((provider as any).url).toBe('http://test.wms/');
    expect((provider as any).layers).toBe('layer1');
  });

  it('should create terrain provider', async () => {
    const provider = await createTerrainProvider({ url: 'http://test.terrain' });
    expect(provider).toBeDefined();
    expect((provider as any).url).toBe('http://test.terrain');
  });
});
