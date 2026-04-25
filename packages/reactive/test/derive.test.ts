import { describe, it, expect, vi } from 'vitest';
import { derive, memo } from '../src/derive/index';
import { signal } from '../src/index';

describe('derive module', () => {
  it('should alias computed as derive', () => {
    const s = signal(10);
    const d = derive(() => s.get() * 2);
    expect(d.get()).toBe(20);
    
    s.set(20);
    expect(d.get()).toBe(40);
  });

  it('should alias computed as memo', () => {
    const s = signal(5);
    const m = memo(() => s.get() + 5);
    expect(m.get()).toBe(10);
    
    s.set(10);
    expect(m.get()).toBe(15);
  });
});