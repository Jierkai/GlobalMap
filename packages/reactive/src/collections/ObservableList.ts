/**
 * @module ObservableList
 *
 * 响应式列表实现，提供类似 Array 的 API，同时自动追踪变化。
 *
 * 内部使用两个信号：
 * - `_lenSig`：追踪列表长度变化
 * - `_versionSig`：追踪列表内容变化（每次修改操作递增版本号）
 *
 * 读取操作（get/length/toArray）会通过信号建立依赖，
 * 写入操作（set/push/pop/splice/clear）在 `untrack` 中执行以避免循环依赖。
 */

import { signal, untrack } from '../index';

export class ObservableList<T> {
  /** 底层数据存储 */
  private _items: T[];
  /** 追踪列表长度变化的信号 */
  private _lenSig = signal(0);
  /** 追踪列表内容变化的版本号信号（每次修改递增） */
  private _versionSig = signal(0);

  /**
   * 创建响应式列表实例。
   *
   * @param initial - 初始元素数组（会被浅拷贝）
   */
  constructor(initial: T[] = []) {
    // 浅拷贝初始数组，避免外部修改影响内部状态
    this._items = [...initial];
    this._lenSig.set(this._items.length);
  }

  /**
   * 获取列表长度。
   *
   * 同时追踪 `_lenSig` 和 `_versionSig`，
   * 无论是长度变化还是内容变化都会触发依赖更新。
   */
  get length(): number {
    this._lenSig.get(); // 追踪长度变化
    this._versionSig.get(); // 追踪内容变化
    return this._items.length;
  }

  /**
   * 获取指定索引处的元素。
   *
   * 通过 `_versionSig` 追踪内容变化，
   * 当列表内容被修改时会触发依赖更新。
   *
   * @param index - 要获取的元素索引
   * @returns 对应索引的元素，索引越界时返回 `undefined`
   */
  get(index: number): T | undefined {
    this._versionSig.get(); // 追踪内容变化
    return this._items[index];
  }

  /**
   * 设置指定索引处的元素值。
   *
   * 在 `untrack` 中执行写入操作，避免在写入过程中触发依赖追踪。
   * 写入后递增版本号以通知所有订阅者。
   *
   * @param index - 要设置的元素索引
   * @param value - 新的元素值
   */
  set(index: number, value: T): void {
    untrack(() => {
      this._items[index] = value;
      // 递增版本号，触发依赖更新
      this._versionSig.set(this._versionSig.get() + 1);
    });
  }

  /**
   * 向列表末尾添加一个或多个元素。
   *
   * @param items - 要添加的元素
   * @returns 添加后列表的新长度
   */
  push(...items: T[]): number {
    let result: number = 0;
    untrack(() => {
      result = this._items.push(...items);
      // 更新长度信号和版本号
      this._lenSig.set(this._items.length);
      this._versionSig.set(this._versionSig.get() + 1);
    });
    return result;
  }

  /**
   * 移除并返回列表最后一个元素。
   *
   * @returns 被移除的元素，列表为空时返回 `undefined`
   */
  pop(): T | undefined {
    let result: T | undefined;
    untrack(() => {
      result = this._items.pop();
      // 更新长度信号和版本号
      this._lenSig.set(this._items.length);
      this._versionSig.set(this._versionSig.get() + 1);
    });
    return result;
  }

  /**
   * 向/从列表中添加/删除元素（类似 Array.splice）。
   *
   * @param start - 开始操作的索引位置
   * @param deleteCount - 要删除的元素数量（可选，省略则删除从 start 到末尾的所有元素）
   * @param items - 要插入的新元素
   * @returns 被删除的元素数组
   */
  splice(start: number, deleteCount?: number, ...items: T[]): T[] {
    let result: T[] = [];
    untrack(() => {
      if (deleteCount === undefined) {
        // 未指定 deleteCount 时，删除从 start 到末尾的所有元素
        result = this._items.splice(start);
      } else {
        result = this._items.splice(start, deleteCount, ...items);
      }
      // 更新长度信号和版本号
      this._lenSig.set(this._items.length);
      this._versionSig.set(this._versionSig.get() + 1);
    });
    return result;
  }

  /**
   * 清空列表中的所有元素。
   */
  clear(): void {
    untrack(() => {
      this._items.length = 0;
      // 重置长度信号并递增版本号
      this._lenSig.set(0);
      this._versionSig.set(this._versionSig.get() + 1);
    });
  }

  /**
   * 将列表转换为普通数组（浅拷贝）。
   *
   * 同时追踪长度和内容变化，确保在 effect 中使用时能正确响应更新。
   *
   * @returns 包含所有元素的新数组
   */
  toArray(): T[] {
    this._versionSig.get(); // 追踪内容变化
    this._lenSig.get(); // 追踪长度变化
    return [...this._items];
  }
}
