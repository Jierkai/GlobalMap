// @ts-nocheck
/**
 * 执行对象的深度克隆
 * 使用原生 structuredClone，如不支持则回退为 JSON 序列化
 * @param entity 要克隆的目标
 * @returns 复制后的实体
 */
export function deepClone<T>(entity: T): T {
  if (entity === null || entity === undefined) return entity;
  if (typeof structuredClone === 'function') {
    return structuredClone(entity);
  }
  return JSON.parse(JSON.stringify(entity));
}

/**
 * 递归合并两个对象
 * @param base 基础对象
 * @param extension 需要合并的扩展属性
 * @returns 合并生成的新对象
 */
export function deepMerge<T extends object>(base: T, extension: Partial<T>): T {
  const output = { ...base };
  for (const prop in extension) {
    if (Object.prototype.hasOwnProperty.call(extension, prop)) {
      const extVal = extension[prop];
      const baseVal = output[prop];
      
      const isExtObj = extVal && typeof extVal === 'object' && !Array.isArray(extVal);
      const isBaseObj = baseVal && typeof baseVal === 'object' && !Array.isArray(baseVal);
      
      if (isExtObj && isBaseObj) {
        output[prop] = deepMerge(baseVal as T[Extract<keyof T, string>], extVal as any);
      } else {
        output[prop] = extVal as any;
      }
    }
  }
  return output;
}
