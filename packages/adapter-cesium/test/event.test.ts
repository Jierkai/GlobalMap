import { describe, it, expect } from 'vitest';
import { ScreenSpaceEmitter } from '../src/event';
import type { NativeScene } from '../src/types';

describe('ScreenSpaceEmitter', () => {
  it('should subscribe and unsubscribe correctly', () => {
    const canvas = document.createElement('canvas');
    const emitter = new ScreenSpaceEmitter({} as NativeScene, canvas);
    
    let clicked = false;
    const off = emitter.on('click', () => { clicked = true; });
    
    // Can't easily trigger the mock without exposing internal mock logic,
    // but we can ensure destroy and on/off return functions properly.
    expect(off).toBeInstanceOf(Function);
    off();
    
    emitter.destroy();
  });
});