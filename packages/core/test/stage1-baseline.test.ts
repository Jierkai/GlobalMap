import { describe, it, expect } from 'vitest';
import * as core from '../src/index.js';

describe('stage-1 baseline (delete after stage 1 completes)', () => {
  it('@cgx/core currently re-exports LayerRenderSpec / FeatureRenderSpec', () => {
    expect(typeof core).toBe('object');
    const exported = Object.keys(core);
    expect(exported).toContain('CgxViewer');
    expect(exported).toContain('TypedEmitter');
  });
});
