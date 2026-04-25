import type { CgxViewer } from '../viewer/CgxViewer.js';

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
  /** 显式启用或禁用 HUD。如果省略，默认仅在开发环境 (DEV) 启用。 */
  enabled?: boolean;
}

/** 被挂载后的 Vitals HUD 实例。 */
export interface VitalsHud {
  /** 从 DOM 中移除并销毁 HUD 面板。 */
  detach(): void;
}

/**
 * 创建并挂载 Vitals HUD (平视显示器) 面板，用于监视渲染性能指标。
 * @param viewer 挂载面板的 Viewer 实例。
 * @param opts 配置要显示的指标选项。
 * @returns 能够控制 HUD 的 VitalsHud 实例，如果未启用则返回 null。
 */
export function createVitalsHud(viewer: CgxViewer, opts: VitalsConfig = {}): VitalsHud | null {
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

  const content = [];
  if (opts.fps !== false) content.push('FPS: --');
  if (opts.memory !== false) content.push('MEM: --');
  if (opts.drawCalls !== false) content.push('Draws: --');
  if (opts.pickLatency !== false) content.push('Pick: --ms');
  
  container.innerHTML = content.join('<br>');
  document.body.appendChild(container);

  return {
    detach() {
      if (container.parentNode) {
        container.parentNode.removeChild(container);
      }
    }
  };
}
