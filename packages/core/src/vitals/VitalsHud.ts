import type { CgxViewer } from '../viewer/CgxViewer.js';
import { metricsBus } from './MetricsBus.js';

/** Vitals HUD 面板的配置选项。 */
export interface VitalsConfig {
  /** 是否显示每秒帧数 (FPS) 指标。默认为 true。 */
  fps?: boolean;
  /** 是否显示内存使用量指标。默认为 true。 */
  memory?: boolean;
  /** 是否显示绘制调用 (Draw Calls) 指标。默认为 true。 */
  drawCalls?: boolean;
  /** 是否显示拾取延迟 (Pick Latency) 指标。默认为 true。 */
  pickLatency?: boolean;
  /** 是否显示每帧 patch 数量指标。默认为 false，需显式设为 true 才渲染。 */
  framePatchCount?: boolean;
  /** 是否显示每帧原生写入次数指标。默认为 false，需显式设为 true 才渲染。 */
  frameNativeWriteCount?: boolean;
  /** 是否显示对象池命中率指标。默认为 false，需显式设为 true 才渲染。 */
  poolHitRate?: boolean;
  /** 是否显示逃生舱口调用次数指标。默认为 false，需显式设为 true 才渲染。 */
  escapeHatchCallCount?: boolean;
  /** 显式启用或禁用 HUD。如果省略，默认仅在开发环境 (DEV) 启用。 */
  enabled?: boolean;
}

/** 被挂载后的 Vitals HUD 实例。 */
export interface VitalsHud {
  /** 从 DOM 中移除并销毁 HUD 面板。 */
  detach(): void;
}

/** 根据快照和配置项重新渲染 HUD 内容。 */
function renderContent(container: HTMLElement, opts: VitalsConfig): void {
  const snap = metricsBus.snapshot();
  const lines: string[] = [];

  if (opts.fps !== false) lines.push(`FPS: ${snap['fps'] ?? '--'}`);
  if (opts.memory !== false) lines.push(`MEM: ${snap['memory'] ?? '--'}`);
  if (opts.drawCalls !== false) lines.push(`Draws: ${snap['drawCalls'] ?? '--'}`);
  if (opts.pickLatency !== false) lines.push(`Pick: ${snap['pickLatency'] !== undefined ? `${snap['pickLatency']}ms` : '--ms'}`);

  if (opts.framePatchCount === true) {
    lines.push(`Patch: ${snap['framePatchCount'] ?? '--'}`);
  }
  if (opts.frameNativeWriteCount === true) {
    lines.push(`Writes: ${snap['frameNativeWriteCount'] ?? '--'}`);
  }
  if (opts.poolHitRate === true) {
    const raw = snap['poolHitRate'];
    if (raw !== undefined && raw >= 0 && raw <= 1) {
      lines.push(`Pool: ${Math.round(raw * 100)}%`);
    } else {
      lines.push(`Pool: ${raw ?? '--'}`);
    }
  }
  if (opts.escapeHatchCallCount === true) {
    lines.push(`Escape: ${snap['escapeHatchCallCount'] ?? '--'}`);
  }

  container.innerHTML = lines.join('<br>');
}

/**
 * 创建并挂载 Vitals HUD (平视显示器) 面板，用于监视渲染性能指标。
 * @param viewer 挂载面板的 Viewer 实例。
 * @param opts 配置要显示的指标选项。
 * @returns 能够控制 HUD 的 VitalsHud 实例，如果未启用则返回 null。
 */
export function createVitalsHud(_viewer: CgxViewer, opts: VitalsConfig = {}): VitalsHud | null {
  const importMeta = import.meta as unknown as { env?: { DEV?: boolean } };
  const isDev = typeof import.meta !== 'undefined' && importMeta.env && importMeta.env.DEV;
  if (!opts.enabled && !isDev) {
    return null;
  }

  const container = document.createElement('div');
  container.className = 'cgx-vitals-hud';
  container.style.position = 'absolute';
  container.style.top = '10px';
  container.style.left = '10px';
  container.style.padding = '8px';
  container.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
  container.style.color = '#fff';
  container.style.fontFamily = 'monospace';
  container.style.fontSize = '12px';
  container.style.zIndex = '9999';
  container.style.pointerEvents = 'none';

  // 同步渲染初始内容（含标签占位符），不等待任何帧
  renderContent(container, opts);
  document.body.appendChild(container);

  // 订阅指标总线，任何指标更新时重新渲染
  const unsubscribe = metricsBus.subscribe(() => {
    renderContent(container, opts);
  });

  return {
    detach() {
      unsubscribe();
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
}
