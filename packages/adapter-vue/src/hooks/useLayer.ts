import { inject, ref, computed } from 'vue';

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
