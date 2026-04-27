import { inject, ref, computed } from 'vue';

/**
 * 图层组合式函数
 *
 * @description
 * Vue3 组合式 API，通过 id 查找 Viewer 中的图层实例，
 * 并提供 show、hide、setOpacity 等便捷操作方法。
 *
 * @param id - 图层唯一标识
 * @returns 包含 computed layer 及操作方法的对象
 */
export function useLayer(id: string) {
  const viewer = inject<any>('cgxViewer');
  
  const layer = computed(() => {
    if (!viewer || !viewer.layers) return null;
    const layersList = viewer.layers.list()();
    return layersList.find((l: any) => l.id === id);
  });

  return {
    layer,
    show() { if (layer.value) layer.value.visible(true); },
    hide() { if (layer.value) layer.value.visible(false); },
    setOpacity(opacity: number) { if (layer.value) layer.value.opacity(opacity); }
  };
}
