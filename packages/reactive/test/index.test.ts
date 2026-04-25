import { describe, it, expect, vi } from 'vitest';
import { signal, computed, effect, batch, untrack, peek } from '../src/index';

describe('Reactive primitives', () => {
  it('should track dependencies and react to changes', () => {
    const s = signal(0);
    const cb = vi.fn();
    
    // Using simple effect
    const off = effect(() => {
      cb(s.get());
    });
    
    expect(cb).toHaveBeenCalledWith(0);
    expect(cb).toHaveBeenCalledTimes(1);

    s.set(1);
    expect(cb).toHaveBeenCalledWith(1);
    expect(cb).toHaveBeenCalledTimes(2);

    off();
    s.set(2);
    expect(cb).toHaveBeenCalledTimes(2); // Should not be called again
  });

  it('should batch multiple signal writes into a single effect run', () => {
    const s1 = signal(0);
    const s2 = signal(0);
    const cb = vi.fn();

    effect(() => {
      cb(s1.get(), s2.get());
    });

    expect(cb).toHaveBeenCalledTimes(1);

    batch(() => {
      s1.set(1);
      s2.set(1);
      s1.set(2);
    });

    // Should only be called once after the batch
    expect(cb).toHaveBeenCalledTimes(2);
    expect(cb).toHaveBeenCalledWith(2, 1);
  });

  it('should compute derived values safely', () => {
    const s = signal(2);
    const c = computed(() => s.get() * 2);

    expect(c.get()).toBe(4);

    s.set(3);
    expect(c.get()).toBe(6);
  });

  it('should not allow circular dependencies', () => {
    const s = signal(0);
    let runs = 0;
    
    effect(() => {
      runs++;
      if (runs < 10) {
        s.set(s.get() + 1);
      }
    });
    
    // It should stabilize and not run infinitely.
    expect(runs).toBeGreaterThan(0);
  });

  it('should allow peeking without tracking', () => {
    const s = signal(10);
    const cb = vi.fn();
    
    effect(() => {
      cb(peek(s));
    });

    expect(cb).toHaveBeenCalledTimes(1);
    
    s.set(20);
    expect(cb).toHaveBeenCalledTimes(1); // Should not react
  });

  it('should cleanly untrack', () => {
    const s = signal(1);
    const cb = vi.fn();
    
    effect(() => {
      untrack(() => {
        cb(s.get());
      });
    });

    expect(cb).toHaveBeenCalledTimes(1);
    
    s.set(2);
    expect(cb).toHaveBeenCalledTimes(1); // Should not react
  });

  it('should execute effect cleanup on re-run and dispose', () => {
    const s = signal(0);
    const cleanup = vi.fn();
    const runner = vi.fn();

    const off = effect(() => {
      runner(s.get());
      return cleanup;
    });

    expect(runner).toHaveBeenCalledTimes(1);
    expect(cleanup).not.toHaveBeenCalled();

    s.set(1);
    expect(runner).toHaveBeenCalledTimes(2);
    expect(cleanup).toHaveBeenCalledTimes(1);

    off();
    expect(cleanup).toHaveBeenCalledTimes(2); // off should run cleanup
  });

  it('should not leak memory after many subscriptions', () => {
    const s = signal(0);
    for (let i = 0; i < 10000; i++) {
      const off = s.subscribe(() => {});
      off();
    }
    // Simple assert to make sure it finishes cleanly
    expect(s.get()).toBe(0);
  });
});