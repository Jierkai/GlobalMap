/**
 * @cgx/history 单元测试
 *
 * 覆盖：
 * - 基本 execute / undo / redo 循环
 * - can.undo / can.redo 响应式信号
 * - coalesceWith 合并策略
 * - limit 超限时丢弃最早命令
 * - clear 清空所有栈
 * - snapshot / restore 序列化
 * - dispose 销毁后操作抛异常
 * - 事件派发（changed）
 */

import { describe, it, expect, vi } from 'vitest';
import { createHistory } from '../src/HistoryManager';
import type { Command, CommandContext } from '../src/types';

// ---------------------------------------------------------------------------
// 测试辅助
// ---------------------------------------------------------------------------

/** 简单的数值累加/累减命令 */
interface CounterPayload {
  delta: number;
}

function createCounterCommand(
  delta: number,
  counter: { value: number }
): Command<CounterPayload> {
  return {
    id: `cmd-${delta}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'counter',
    payload: { delta },
    apply() {
      counter.value += delta;
    },
    revert() {
      counter.value -= delta;
    },
  };
}

/** 可合并的位置移动命令 */
interface MovePayload {
  x: number;
  y: number;
}

function createMoveCommand(
  x: number,
  y: number,
  pos: { x: number; y: number }
): Command<MovePayload> {
  return {
    id: `move-${x}-${y}-${Math.random().toString(36).slice(2, 8)}`,
    kind: 'move',
    payload: { x, y },
    apply() {
      pos.x = x;
      pos.y = y;
    },
    revert() {
      // revert 到初始位置（测试中手动管理）
    },
    coalesceWith(next) {
      // 合并为最终位置
      return createMoveCommand(next.payload.x, next.payload.y, pos);
    },
  };
}

// ---------------------------------------------------------------------------
// 测试套件
// ---------------------------------------------------------------------------

describe('createHistory', () => {
  it('应创建一个空的 History 实例', () => {
    const history = createHistory({ data: null });
    expect(history.undoDepth).toBe(0);
    expect(history.redoDepth).toBe(0);
    expect(history.can.undo.get()).toBe(false);
    expect(history.can.redo.get()).toBe(false);
    expect(history.disposed).toBe(false);
  });
});

describe('History.execute', () => {
  it('执行命令后 undo 栈深度为 1', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(5, counter));

    expect(counter.value).toBe(5);
    expect(history.undoDepth).toBe(1);
    expect(history.redoDepth).toBe(0);
    expect(history.can.undo.get()).toBe(true);
    expect(history.can.redo.get()).toBe(false);
  });

  it('连续执行 n 次命令，undo 栈深度为 n', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    for (let i = 1; i <= 10; i++) {
      await history.execute(createCounterCommand(i, counter));
    }

    expect(counter.value).toBe(55); // 1+2+...+10
    expect(history.undoDepth).toBe(10);
  });

  it('执行新命令时清空 redo 栈', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(1, counter));
    await history.execute(createCounterCommand(2, counter));
    await history.undo();
    expect(history.redoDepth).toBe(1);

    await history.execute(createCounterCommand(10, counter));
    expect(history.redoDepth).toBe(0);
    expect(history.can.redo.get()).toBe(false);
  });
});

describe('History.undo', () => {
  it('undo n 次回到初始状态', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    for (let i = 1; i <= 5; i++) {
      await history.execute(createCounterCommand(i, counter));
    }
    expect(counter.value).toBe(15);

    for (let i = 0; i < 5; i++) {
      await history.undo();
    }

    expect(counter.value).toBe(0);
    expect(history.undoDepth).toBe(0);
    expect(history.redoDepth).toBe(5);
    expect(history.can.undo.get()).toBe(false);
    expect(history.can.redo.get()).toBe(true);
  });

  it('undo 空栈不抛异常', async () => {
    const history = createHistory({ data: null });
    await history.undo(); // 不应抛异常
    expect(history.undoDepth).toBe(0);
  });
});

describe('History.redo', () => {
  it('redo n 次重现所有命令', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    for (let i = 1; i <= 5; i++) {
      await history.execute(createCounterCommand(i, counter));
    }

    // undo 全部
    for (let i = 0; i < 5; i++) {
      await history.undo();
    }
    expect(counter.value).toBe(0);

    // redo 全部
    for (let i = 0; i < 5; i++) {
      await history.redo();
    }

    expect(counter.value).toBe(15);
    expect(history.undoDepth).toBe(5);
    expect(history.redoDepth).toBe(0);
    expect(history.can.undo.get()).toBe(true);
    expect(history.can.redo.get()).toBe(false);
  });

  it('redo 空栈不抛异常', async () => {
    const history = createHistory({ data: null });
    await history.redo(); // 不应抛异常
    expect(history.redoDepth).toBe(0);
  });
});

describe('History.coalesceWith 合并策略', () => {
  it('连续同 kind 且 coalesceWith 非空时合并为单次', async () => {
    const pos = { x: 0, y: 0 };
    const history = createHistory({ data: null });

    await history.execute(createMoveCommand(10, 20, pos));
    await history.execute(createMoveCommand(30, 40, pos));
    await history.execute(createMoveCommand(50, 60, pos));

    // 合并后 undo 栈应只有 1 个命令（最终位置）
    expect(history.undoDepth).toBe(1);
    expect(pos.x).toBe(50);
    expect(pos.y).toBe(60);
  });

  it('不同 kind 的命令不合并', async () => {
    const counter = { value: 0 };
    const pos = { x: 0, y: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(5, counter));
    await history.execute(createMoveCommand(10, 20, pos));

    expect(history.undoDepth).toBe(2);
  });

  it('合并后 undo 恢复到合并前状态', async () => {
    const pos = { x: 0, y: 0 };
    const history = createHistory({ data: null });

    await history.execute(createMoveCommand(10, 20, pos));
    await history.execute(createMoveCommand(30, 40, pos));

    expect(history.undoDepth).toBe(1);
    expect(pos.x).toBe(30);

    await history.undo();
    // 合并后的 revert 应该恢复
    expect(history.undoDepth).toBe(0);
    expect(history.redoDepth).toBe(1);
  });
});

describe('History.limit 超限丢弃', () => {
  it('超出 limit 时最早命令被丢弃', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null }, { limit: 3 });

    for (let i = 1; i <= 5; i++) {
      await history.execute(createCounterCommand(i, counter));
    }

    // undo 栈最多 3 个
    expect(history.undoDepth).toBe(3);
    expect(counter.value).toBe(15); // 所有命令都已执行

    // undo 3 次后，最早两个命令（delta=1, delta=2）已丢失
    await history.undo(); // delta=5
    await history.undo(); // delta=4
    await history.undo(); // delta=3

    expect(counter.value).toBe(3); // 15 - 5 - 4 - 3
    expect(history.undoDepth).toBe(0);
  });

  it('limit=1 时只保留最近一次命令', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null }, { limit: 1 });

    await history.execute(createCounterCommand(10, counter));
    await history.execute(createCounterCommand(20, counter));

    expect(history.undoDepth).toBe(1);

    await history.undo();
    expect(counter.value).toBe(10); // 只能撤销最后一次
    expect(history.undoDepth).toBe(0);
  });
});

describe('History.clear', () => {
  it('清空所有历史记录', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(1, counter));
    await history.execute(createCounterCommand(2, counter));
    await history.undo();

    expect(history.undoDepth).toBe(1);
    expect(history.redoDepth).toBe(1);

    history.clear();

    expect(history.undoDepth).toBe(0);
    expect(history.redoDepth).toBe(0);
    expect(history.can.undo.get()).toBe(false);
    expect(history.can.redo.get()).toBe(false);
  });
});

describe('History.snapshot / restore', () => {
  it('snapshot 生成非空 Uint8Array', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(1, counter));
    await history.execute(createCounterCommand(2, counter));

    const bytes = history.snapshot();
    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(0);
  });

  it('restore 从快照恢复 undo/redo 栈', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(10, counter));
    await history.execute(createCounterCommand(20, counter));
    await history.undo(); // redo 栈有 1 个

    const bytes = history.snapshot();

    // 创建新 History 并恢复
    const history2 = createHistory({ data: null });
    history2.restore(bytes, (kind, payload) => {
      const p = payload as CounterPayload;
      return createCounterCommand(p.delta, counter);
    });

    expect(history2.undoDepth).toBe(1);
    expect(history2.redoDepth).toBe(1);
  });

  it('restore 后可以正常 undo/redo', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute(createCounterCommand(10, counter));
    await history.execute(createCounterCommand(20, counter));

    const bytes = history.snapshot();

    const counter2 = { value: 0 };
    const history2 = createHistory({ data: null });
    history2.restore(bytes, (_kind, payload) => {
      const p = payload as CounterPayload;
      return createCounterCommand(p.delta, counter2);
    });

    // 手动设置 counter2 的值（模拟已执行状态）
    counter2.value = 30;

    await history2.undo();
    expect(counter2.value).toBe(10); // 30 - 20

    await history2.redo();
    expect(counter2.value).toBe(30); // 10 + 20
  });

  it('不支持的快照版本抛异常', () => {
    const history = createHistory({ data: null });
    const badBytes = new TextEncoder().encode(JSON.stringify({ v: 99, undo: [], redo: [] }));

    expect(() => {
      history.restore(badBytes, () => ({
        id: 'x',
        kind: 'x',
        payload: null,
        apply() {},
        revert() {},
      }));
    }).toThrow('Unsupported snapshot version: 99');
  });
});

describe("History.on('changed') 事件", () => {
  it('execute 触发 changed 事件', async () => {
    const history = createHistory({ data: null });
    const handler = vi.fn();
    history.on('changed', handler);

    await history.execute({
      id: 'test',
      kind: 'test',
      payload: null,
      apply() {},
      revert() {},
    });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({
      action: 'execute',
      undoDepth: 1,
      redoDepth: 0,
    });
  });

  it('undo 触发 changed 事件', async () => {
    const history = createHistory({ data: null });
    const handler = vi.fn();

    await history.execute({
      id: 'test',
      kind: 'test',
      payload: null,
      apply() {},
      revert() {},
    });

    history.on('changed', handler);
    await history.undo();

    expect(handler).toHaveBeenCalledWith({
      action: 'undo',
      undoDepth: 0,
      redoDepth: 1,
    });
  });

  it('redo 触发 changed 事件', async () => {
    const history = createHistory({ data: null });
    const handler = vi.fn();

    await history.execute({
      id: 'test',
      kind: 'test',
      payload: null,
      apply() {},
      revert() {},
    });
    await history.undo();

    history.on('changed', handler);
    await history.redo();

    expect(handler).toHaveBeenCalledWith({
      action: 'redo',
      undoDepth: 1,
      redoDepth: 0,
    });
  });

  it('clear 触发 changed 事件', async () => {
    const history = createHistory({ data: null });
    const handler = vi.fn();

    await history.execute({
      id: 'test',
      kind: 'test',
      payload: null,
      apply() {},
      revert() {},
    });

    history.on('changed', handler);
    history.clear();

    expect(handler).toHaveBeenCalledWith({
      action: 'clear',
      undoDepth: 0,
      redoDepth: 0,
    });
  });

  it('off 取消订阅', async () => {
    const history = createHistory({ data: null });
    const handler = vi.fn();

    history.on('changed', handler);
    history.off('changed', handler);

    await history.execute({
      id: 'test',
      kind: 'test',
      payload: null,
      apply() {},
      revert() {},
    });

    expect(handler).not.toHaveBeenCalled();
  });
});

describe('History.dispose', () => {
  it('dispose 后 disposed 为 true', () => {
    const history = createHistory({ data: null });
    expect(history.disposed).toBe(false);
    history.dispose();
    expect(history.disposed).toBe(true);
  });

  it('dispose 后 can 信号为 false', () => {
    const history = createHistory({ data: null });
    history.dispose();
    expect(history.can.undo.get()).toBe(false);
    expect(history.can.redo.get()).toBe(false);
  });

  it('dispose 后操作抛异常', async () => {
    const history = createHistory({ data: null });
    history.dispose();

    await expect(
      history.execute({
        id: 'test',
        kind: 'test',
        payload: null,
        apply() {},
        revert() {},
      })
    ).rejects.toThrow('History instance has been disposed');

    await expect(history.undo()).rejects.toThrow('History instance has been disposed');
    await expect(history.redo()).rejects.toThrow('History instance has been disposed');
    expect(() => history.clear()).toThrow('History instance has been disposed');
  });

  it('重复 dispose 不抛异常', () => {
    const history = createHistory({ data: null });
    history.dispose();
    history.dispose(); // 不应抛异常
  });
});

describe('History 异步 Command', () => {
  it('支持 async apply', async () => {
    const counter = { value: 0 };
    const history = createHistory({ data: null });

    await history.execute({
      id: 'async-cmd',
      kind: 'async-counter',
      payload: { delta: 5 },
      async apply() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        counter.value += 5;
      },
      async revert() {
        await new Promise((resolve) => setTimeout(resolve, 10));
        counter.value -= 5;
      },
    });

    expect(counter.value).toBe(5);
    expect(history.undoDepth).toBe(1);

    await history.undo();
    expect(counter.value).toBe(0);
  });
});

describe('History CommandContext 传递', () => {
  it('apply/revert 接收到正确的 context', async () => {
    const receivedCtx: unknown[] = [];
    const ctx = { data: { name: 'test-viewer' } };

    const history = createHistory(ctx);

    await history.execute({
      id: 'ctx-test',
      kind: 'ctx-test',
      payload: null,
      apply(c) {
        receivedCtx.push(c.data);
      },
      revert(c) {
        receivedCtx.push(c.data);
      },
    });

    await history.undo();

    expect(receivedCtx).toHaveLength(2);
    expect(receivedCtx[0]).toBe(ctx.data);
    expect(receivedCtx[1]).toBe(ctx.data);
  });
});
