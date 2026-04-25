import { describe, it, expect } from 'vitest';
import { createBaiduProvider } from '../src/baidu/index.js';
import { createTiandituProvider } from '../src/tianditu/index.js';
import { createGaodeProvider } from '../src/gaode/index.js';

describe('CN Providers', () => {
  it('should create Baidu provider with ready signal', () => {
    const provider = createBaiduProvider({ style: 'dark' });
    expect(provider.ready()).toBe(true);
    expect(provider.toCesium()).toEqual({ type: 'baidu', style: 'dark' });
  });

  it('should create Tianditu provider with ready signal', () => {
    const provider = createTiandituProvider({ token: '123', type: 'img' });
    expect(provider.ready()).toBe(true);
    expect(provider.toCesium()).toEqual({ token: '123', type: 'img' });
  });

  it('should create Gaode provider with ready signal', () => {
    const provider = createGaodeProvider({ style: 'vec' });
    expect(provider.ready()).toBe(true);
    expect(provider.toCesium()).toEqual({ type: 'gaode', style: 'vec' });
  });
});
