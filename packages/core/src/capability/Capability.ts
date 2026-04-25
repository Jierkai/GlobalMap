import type { CgxViewer } from '../viewer/CgxViewer.js';

/**
 * 可以被安装到 CgxViewer 中的插件能力接口。
 * 遵循“组合优于继承”的设计模式。
 * @template T 该能力返回的 API 实例类型。
 */
export interface Capability<T> {
  /** 能力的唯一标识符，用于防止重复安装。 */
  readonly id: string;
  /**
   * 初始化并将能力注入到给定的视图实例中。
   * @param viewer 视图实例。
   * @returns 注入后返回的能力 API 实例。
   */
  install(viewer: CgxViewer): T;
  /** 当能力被卸载或视图被销毁时，清理相关资源。 */
  dispose?(): void;
}

/** 基础的相机操作能力。 */
export const CameraOps: Capability<{
  flyTo: (position: unknown) => void;
  lookAt: (position: unknown) => void;
  pick: (windowPosition: unknown) => unknown;
}> = {
  id: 'camera',
  install(viewer: CgxViewer) {
    // 实际实现中，这些操作将委派给 L1 适配器处理
    return {
      flyTo: (position: unknown) => {},
      lookAt: (position: unknown) => {},
      pick: (windowPosition: unknown) => null,
    };
  }
};

/** 基础的时钟与时间线操作能力。 */
export const ClockOps: Capability<{
  setTime: (time: unknown) => void;
}> = {
  id: 'clock',
  install(viewer: CgxViewer) {
    return {
      setTime: (time: unknown) => {}
    };
  }
};

/** 基础的输入事件处理能力。 */
export const InputOps: Capability<{
  on: (event: string, callback: Function) => void;
}> = {
  id: 'input',
  install(viewer: CgxViewer) {
    return {
      on: (event: string, callback: Function) => {}
    };
  }
};
