import { describe, it, expect } from 'vitest';
import { deepClone, deepMerge } from '../src/util/object';

describe('Object Utilities', () => {
  describe('deepClone', () => {
    it('should clone primitives directly', () => {
      expect(deepClone(null)).toBeNull();
      expect(deepClone(undefined)).toBeUndefined();
      expect(deepClone(123)).toBe(123);
      expect(deepClone('test')).toBe('test');
    });

    it('should create a deep copy of an object', () => {
      const orig = { a: 1, b: { c: 2 } };
      const clone = deepClone(orig);
      expect(clone).toEqual(orig);
      expect(clone).not.toBe(orig);
      expect(clone.b).not.toBe(orig.b);
    });
  });

  describe('deepMerge', () => {
    it('should merge two nested objects without modifying the original', () => {
      const base = { a: 1, b: { x: 10, y: 20 } };
      const extension = { b: { y: 30, z: 40 }, c: 2 };
      
      const merged = deepMerge(base, extension);
      
      expect(merged).toEqual({
        a: 1,
        b: { x: 10, y: 30, z: 40 },
        c: 2
      });
      // Originals should remain untouched
      expect(base.b.y).toBe(20);
    });
    
    it('should replace arrays completely instead of merging', () => {
      const base = { items: [1, 2] };
      const ext = { items: [3, 4, 5] };
      const merged = deepMerge(base, ext);
      expect(merged.items).toEqual([3, 4, 5]);
    });
  });
});
