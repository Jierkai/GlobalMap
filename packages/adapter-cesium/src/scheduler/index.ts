import { UpdateBatcher } from './UpdateBatcher';

let defaultBatcher: UpdateBatcher | null = null;

/** 获取进程级默认批处理器单例。 */
export function getDefaultBatcher(): UpdateBatcher {
  if (!defaultBatcher) defaultBatcher = new UpdateBatcher();
  return defaultBatcher;
}

/** 仅供测试：重置默认批处理器单例。 */
export function __resetBatcherForTest__(): void {
  defaultBatcher = null;
}

export { UpdateBatcher, type UpdateBatcherOptions } from './UpdateBatcher';
