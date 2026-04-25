import { signal } from 'alien-signals';
import { TypedEmitter, type Off } from '../typed-events/Emitter.js';
import { CgxError, ErrorCodes } from '../errors/CgxError.js';
import type { Capability } from '../capability/Capability.js';

/**
 * 创建 CgxViewer 实例的配置项。
 */
export interface CgxViewerOptions {
  /** 视图将要挂载的容器元素或其 ID。 */
  container: string | HTMLElement;
  /** L1 层适配器，负责将调用委派给底层引擎（如 Cesium）。 */
  adapter: { initialize?(c: string | HTMLElement): Promise<void> | void; dispose?(): Promise<void> | void } | Record<string, unknown>; // L1 Adapter
}

/** 表示视图生命周期的状态。 */
export type ViewerStatus = 'idle' | 'ready' | 'disposing' | 'disposed';

/** 返回视图状态的响应式信号。 */
export type ViewerStatusSignal = { (): ViewerStatus; (value: ViewerStatus): void };

/** 视图派发的强类型事件。 */
export interface TypedEvents {
  /** 当视图成功挂载并初始化时触发。 */
  'attach': { viewer: CgxViewer };
  /** 在视图开始卸载和销毁之前触发。 */
  'detach': { viewer: CgxViewer };
  /** 初始化过程中发生严重错误时触发。 */
  'error': { error: Error };
  [key: string]: unknown;
}

/**
 * Cgx 框架的核心 Viewer 实例。
 * 提供响应式生命周期、强类型的事件派发以及基于能力组合的插件系统。
 */
export interface CgxViewer {
  /** 视图实例的唯一标识符。 */
  readonly id: string;
  /** 持有当前生命周期状态的响应式信号。 */
  readonly status: ViewerStatusSignal;
  
  /** 初始化视图及其适配器。当完全准备就绪时决议 Promise。 */
  ready(): Promise<void>;
  /** 幂等性地销毁视图、适配器及所有已安装的能力插件。 */
  dispose(): Promise<void>;
  
  /** 订阅一个强类型事件。 */
  on<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off;
  /** 仅订阅一次强类型事件。 */
  once<K extends keyof TypedEvents>(event: K, handler: (payload: TypedEvents[K]) => void): Off;
  /** 取消订阅一个强类型事件。如果未提供处理函数，则移除该事件下的所有处理函数。 */
  off<K extends keyof TypedEvents>(event: K, handler?: (payload: TypedEvents[K]) => void): void;
  
  /**
   * 将一个能力插件注入到视图中。
   * 如果该能力已被安装，将抛出错误。
   * @param capability 要安装的能力插件。
   */
  use<T>(capability: Capability<T>): T;
  /**
   * 注册一个用于捕获事件派发或渲染期间未被捕获错误的处理函数。
   * @param handler 错误回调函数。
   */
  onUncaught(handler: (error: Error) => void): Off;
}

/**
 * 创建一个新的 CgxViewer 实例。
 * @param opts 包含容器与 L1 层适配器等配置项。
 * @returns 新创建的 CgxViewer 实例。
 */
export function createCgxViewer(opts: CgxViewerOptions): CgxViewer {
  let isDisposed = false;
  let isDisposing = false;
  const id = crypto.randomUUID();
  const status = signal<ViewerStatus>('idle');
  const emitter = new TypedEmitter<TypedEvents>();
  const installedCapabilities = new Map<string, { instance: unknown; dispose?: () => void}>();
  const uncaughtHandlers = new Set<(err: Error) => void>();

  let readyPromise: Promise<void> | null = null;

  const viewer: CgxViewer = {
    id,
    status,

    ready(): Promise<void> {
      if (readyPromise) return readyPromise;

      readyPromise = (async () => {
        try {
          if (opts.adapter && typeof (opts.adapter as any).initialize === 'function') {
            await (opts.adapter as any).initialize(opts.container);
          }
          status('ready');
          emitter.emit('attach', { viewer });
        } catch (err) {
          const error = new CgxError(ErrorCodes.INITIALIZATION_FAILED, 'Viewer initialization failed', err);
          emitter.emit('error', { error });
          throw error;
        }
      })();
      return readyPromise;
    },

    async dispose(): Promise<void> {
      if (isDisposed || isDisposing) return;
      isDisposing = true;
      status('disposing');

      emitter.emit('detach', { viewer });

      for (const [capId, cap] of installedCapabilities.entries()) {
        if (typeof cap.dispose === 'function') {
          try {
            cap.dispose();
          } catch (e) {
            console.error(`Error disposing capability ${capId}:`, e);
          }
        }
      }
      installedCapabilities.clear();

      if (opts.adapter && typeof (opts.adapter as any).dispose === 'function') {
        try {
          await (opts.adapter as any).dispose();
        } catch (e) {
          console.error('Error disposing L1 adapter:', e);
        }
      }

      status('disposed');
      isDisposed = true;
      isDisposing = false;
    },

    on: emitter.on.bind(emitter),
    once: emitter.once.bind(emitter),
    off: emitter.off.bind(emitter),

    use<T>(capability: Capability<T>): T {
      if (installedCapabilities.has(capability.id)) {
        throw new CgxError(ErrorCodes.CAPABILITY_ALREADY_INSTALLED, `Capability ${capability.id} is already installed`);
      }

      try {
        const instance = capability.install(viewer);
        const capRecord: { instance: unknown; dispose?: () => void } = { instance };
        if (capability.dispose) {
          capRecord.dispose = capability.dispose.bind(capability);
        }
        installedCapabilities.set(capability.id, capRecord);
        return instance;
      } catch (err) {
        throw new CgxError(ErrorCodes.INITIALIZATION_FAILED, `Failed to install capability ${capability.id}`, err);
      }
    },

    onUncaught(handler: (error: Error) => void): Off {
      uncaughtHandlers.add(handler);
      return () => uncaughtHandlers.delete(handler);
    }
  };

  return viewer;
}
