import { UpdateBatcher } from './UpdateBatcher';

let defaultBatcher: UpdateBatcher | null = null;
let nextBatchKeyId = 0;

/** 获取进程级默认批处理器单例。 */
export function getDefaultBatcher(): UpdateBatcher {
  if (!defaultBatcher) defaultBatcher = new UpdateBatcher();
  return defaultBatcher;
}

/** 仅供测试：重置默认批处理器单例。 */
export function __resetBatcherForTest__(): void {
  defaultBatcher = null;
  nextBatchKeyId = 0;
}

/** 为单个 handle 创建进程内唯一批处理 key，避免同 id handle 串写。 */
export function createBatchKey(scope: string, id: string): string {
  nextBatchKeyId += 1;
  return `${scope}:${id}:${nextBatchKeyId}`;
}

export { UpdateBatcher, type UpdateBatcherOptions } from './UpdateBatcher';
