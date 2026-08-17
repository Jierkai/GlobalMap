<template>
  <div class="preview-panel">
    <div ref="containerRef" class="map-container"></div>
    <div v-if="status" class="status-badge" :class="status.type">
      {{ status.message }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

type Status = { type: string; message: string } | null

const containerRef = ref<HTMLElement>()
const status = ref<Status>(null)

defineExpose({
  getContainer: () => containerRef.value,
  setStatus: (s: Status) => {
    status.value = s
  },
})
</script>

<style scoped>
.preview-panel {
  position: relative;
  width: 100%;
  height: 100%;
  background: #000;
}
.map-container {
  width: 100%;
  height: 100%;
}
.status-badge {
  position: absolute;
  top: 12px;
  right: 12px;
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  color: #fff;
  z-index: 100;
  pointer-events: none;
}
.status-badge.ready {
  background: rgba(34, 197, 94, 0.9);
}
.status-badge.running {
  background: rgba(59, 130, 130, 0.9);
}
.status-badge.error {
  background: rgba(239, 68, 68, 0.9);
}
</style>
