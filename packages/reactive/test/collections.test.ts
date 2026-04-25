import { describe, it, expect, vi } from 'vitest';
import { ObservableList, ObservableMap } from '../src/collections';
import { effect } from '../src/index';

describe('Observable Collections', () => {
  describe('ObservableList', () => {
    it('should be reactive to array pushes and pops', () => {
      const list = new ObservableList<number>();
      const cb = vi.fn();

      effect(() => {
        cb(list.length);
      });

      expect(cb).toHaveBeenCalledWith(0);

      list.push(1, 2);
      expect(cb).toHaveBeenCalledWith(2);

      const popped = list.pop();
      expect(popped).toBe(2);
      expect(cb).toHaveBeenCalledWith(1);
      
      list.clear();
      expect(cb).toHaveBeenCalledWith(0);
    });

    it('should react to item setting and reading', () => {
      const list = new ObservableList<number>([10, 20]);
      const cb = vi.fn();

      effect(() => {
        cb(list.get(0));
      });

      expect(cb).toHaveBeenCalledWith(10);
      
      list.set(0, 15);
      expect(cb).toHaveBeenCalledWith(15);
    });

    it('should allow splicing', () => {
      const list = new ObservableList([1, 2, 3]);
      const cb = vi.fn();

      effect(() => cb(list.toArray()));

      expect(cb).toHaveBeenCalledWith([1, 2, 3]);
      
      list.splice(1, 1, 99);
      expect(cb).toHaveBeenCalledWith([1, 99, 3]);
    });
  });

  describe('ObservableMap', () => {
    it('should be reactive to map set and delete', () => {
      const map = new ObservableMap<string, number>();
      const cb = vi.fn();

      effect(() => {
        cb(map.size, map.get('a'));
      });

      expect(cb).toHaveBeenCalledWith(0, undefined);

      map.set('a', 1);
      expect(cb).toHaveBeenCalledWith(1, 1);

      map.set('b', 2);
      expect(cb).toHaveBeenCalledWith(2, 1);

      map.delete('a');
      expect(cb).toHaveBeenCalledWith(1, undefined);
      
      map.clear();
      expect(cb).toHaveBeenCalledWith(0, undefined);
    });

    it('should support iterators and has method', () => {
      const map = new ObservableMap<string, number>([['a', 1], ['b', 2]]);
      expect(map.has('a')).toBe(true);
      expect(map.has('c')).toBe(false);

      expect(Array.from(map.keys())).toEqual(['a', 'b']);
      expect(Array.from(map.values())).toEqual([1, 2]);
      expect(Array.from(map.entries())).toEqual([['a', 1], ['b', 2]]);
      
      map.set('c', 3);
      expect(Array.from(map.keys())).toEqual(['a', 'b', 'c']);
    });
  });
});