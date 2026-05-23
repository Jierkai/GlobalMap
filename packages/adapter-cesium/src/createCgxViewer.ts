import { CgxViewer, type CgxViewerOptions as CoreOptions } from '@cgx/core';
import { createViewer as createCesiumViewerHandle } from './viewer';
import { createCesiumAdapter } from './adapter';
import type { CesiumViewerOptions } from './types';

export interface CreateCgxViewerOptions extends Omit<CoreOptions, 'adapter'> {
  container: string | HTMLElement;
  cesium?: CesiumViewerOptions;
}

export function createCgxViewer(opts: CreateCgxViewerOptions): CgxViewer {
  const { container, cesium, ...rest } = opts;
  const handle = createCesiumViewerHandle(container, cesium);
  const adapter = createCesiumAdapter({ viewer: handle, ...(cesium ?? {}) });
  const originalDispose = adapter.dispose.bind(adapter);
  adapter.dispose = async () => {
    await originalDispose();
    handle.destroy();
  };
  return new CgxViewer({ adapter, ...rest });
}
