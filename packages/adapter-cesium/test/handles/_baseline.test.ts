import { describe, it, expect } from 'vitest';
import * as adapterApi from '../../src/index';
import * as core from '@cgx/core';

describe('stage-2 baseline (delete after stage 2 completes)', () => {
  it('adapter mountLayer return type currently lacks Handle methods', () => {
    expect(typeof adapterApi.createCesiumAdapter).toBe('function');
  });

  it('@cgx/core exposes the Handle contract', () => {
    expect(typeof core).toBe('object');
  });
});
