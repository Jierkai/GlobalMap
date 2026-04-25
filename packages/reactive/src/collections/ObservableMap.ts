/**
 * @module ObservableMap
 *
 * 响应式映射实现，提供类似 Map 的 API，同时自动追踪变化。
 *
 * 内部使用 `_versionSig` 信号追踪映射内容变化（每次修改操作递增版本号）。
 *
 * 读取操作（get/has/size/keys/values/entries）会通过信号建立依赖，
 * 写入操作（set/delete/clear）在 `untrack` 中执行以避免循环依赖。
 */

import { signal, untrack } from '../index';

export class ObservableMap<K, V> {
  /** 底层 Map 数据存储 */
  private _map: Map<K, V>;
  /** 追踪映射内容变化的版本号信号（每次修改递增） */
  private _versionSig = signal(0);

  /**
   * 创建响应式映射实例。
   *
   * @param entries - 初始键值对数组（可选）
   */
  constructor(entries?: readonly (readonly [K, V])[] | null) {
    this._map = new Map(entries);
  }

  /**
   * 获取映射中的键值对数量。
   *
   * 通过 `_versionSig` 追踪变化，当映射内容被修改时会触发依赖更新。
   */
  get size(): number {
    this._versionSig.get(); // 追踪内容变化
    return this._map.size;
  }

  /**
   * 检查映射中是否存在指定键。
   *
   * @param key - 要检查的键
   * @returns 如果键存在返回 `true`，否则返回 `false`
   */
  has(key: K): boolean {
    this._versionSig.get(); // 追踪内容变化
    return this._map.has(key);
  }

  /**
   * 获取指定键对应的值。
   *
   * @param key - 要查找的键
   * @returns 对应的值，键不存在时返回 `undefined`
   */
  get(key: K): V | undefined {
    this._versionSig.get(); // 追踪内容变化
    return this._map.get(key);
  }

  /**
   * 设置键值对。如果键已存在则覆盖其值。
   *
   * 在 `untrack` 中执行写入操作，避免在写入过程中触发依赖追踪。
   * 写入后递增版本号以通知所有订阅者。
   *
   * @param key - 要设置的键
   * @param value - 要设置的值
   * @returns 映射实例本身（支持链式调用）
   */
  set(key: K, value: V): this {
    untrack(() => {
      this._map.set(key, value);
      // 递增版本号，触发依赖更新
      this._versionSig.set(this._versionSig.get() + 1);
    });
    return this;
  }

  /**
   * 删除指定键值对。
   *
   * 仅在键实际存在时才递增版本号，避免无效更新。
   *
   * @param key - 要删除的键
   * @returns 如果键存在并被删除返回 `true`，否则返回 `false`
   */
  delete(key: K): boolean {
    let result = false;
    untrack(() => {
      result = this._map.delete(key);
      // 仅在实际删除了元素时才更新版本号
      if (result) {
        this._versionSig.set(this._versionSig.get() + 1);
      }
    });
    return result;
  }

  /**
   * 清空映射中的所有键值对。
   *
   * 仅在映射非空时才执行清空操作并递增版本号。
   */
  clear(): void {
    untrack(() => {
      if (this._map.size > 0) {
        this._map.clear();
        // 递增版本号，触发依赖更新
        this._versionSig.set(this._versionSig.get() + 1);
      }
    });
  }

  /**
   * 返回映射中所有键的迭代器。
   *
   * 通过 `_versionSig` 追踪变化，确保在 effect 中使用时能正确响应更新。
   */
  keys(): IterableIterator<K> {
    this._versionSig.get(); // 追踪内容变化
    return this._map.keys();
  }

  /**
   * 返回映射中所有值的迭代器。
   *
   * 通过 `_versionSig` 追踪变化，确保在 effect 中使用时能正确响应更新。
   */
  values(): IterableIterator<V> {
    this._versionSig.get(); // 追踪内容变化
    return this._map.values();
  }

  /**
   * 返回映射中所有键值对的迭代器。
   *
   * 通过 `_versionSig` 追踪变化，确保在 effect 中使用时能正确响应更新。
   */
  entries(): IterableIterator<[K, V]> {
    this._versionSig.get(); // 追踪内容变化
    return this._map.entries();
  }
}
