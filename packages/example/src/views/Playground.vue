<template>
  <div v-if="entry" class="playground">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <RouterLink class="btn btn-back" to="/">← 案例列表</RouterLink>
        <button class="btn" @click="handleReset">重置</button>
        <button class="btn btn-run" @click="handleRun">运行</button>
      </div>
      <div class="toolbar-title">{{ entry.title }} · GlobalMap 示例</div>
    </div>

    <!-- 主体：左编辑器 + 右实时预览 -->
    <div class="main-body">
      <div class="editor-pane" :style="{ width: editorWidth + 'px' }">
        <CodeEditor ref="editorRef" v-model="code" />
      </div>
      <div class="divider" @mousedown="startResize" />
      <div class="preview-pane">
        <PreviewPanel ref="previewRef" />
      </div>
    </div>

    <!-- 错误信息 -->
    <div v-if="errorMessage" class="error-bar">
      <span class="error-icon">!</span>
      <span class="error-text">{{ errorMessage }}</span>
      <button class="error-close" @click="errorMessage = ''">×</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CodeEditor from '../components/CodeEditor.vue'
import PreviewPanel from '../components/PreviewPanel.vue'
import { demos } from '../demos'
import * as GM from '@globalmap/core'
import * as Cesium from 'cesium'

const route = useRoute()
const router = useRouter()

/** 按路由参数从注册表解析示例条目 */
const entry = computed(() => demos.find((d) => d.name === route.params.name))

// 未知示例：回主页
watch(
  entry,
  (v) => {
    if (!v) router.replace('/')
  },
  { immediate: true },
)

const editorRef = ref<InstanceType<typeof CodeEditor>>()
const previewRef = ref<InstanceType<typeof PreviewPanel>>()
const code = ref('')
const errorMessage = ref('')
const editorWidth = ref(480)

let currentMap: GM.Map3D | null = null

/** 清理当前地图（重新运行 / 离开页面时调用） */
function cleanupMap() {
  if (currentMap) {
    try {
      currentMap.destroy()
    } catch (e) {
      console.warn('[Playground] cleanup error:', e)
    }
    currentMap = null
  }
  delete (window as unknown as { __map?: unknown }).__map
}

/**
 * 执行编辑器代码：new Function 注入 GM（core 编译产物）/ Cesium / container。
 * 地图捕获三选一：返回 Map3D / 返回 resolve 为 Map3D 的 Promise / window.__map。
 */
function executeCode() {
  cleanupMap()

  const container = previewRef.value?.getContainer()
  if (!container) return

  previewRef.value?.setStatus({ type: 'running', message: '运行中...' })

  try {
    const runFn = new Function('GM', 'Cesium', 'container', code.value)
    const result = runFn(GM, Cesium, container)

    if (result instanceof GM.Map3D) {
      currentMap = result
      bindReadyEvent()
    } else if (result && typeof (result as Promise<unknown>).then === 'function') {
      // 支持 async 代码
      ;(result as Promise<unknown>).then((m: unknown) => {
        if (m instanceof GM.Map3D) {
          currentMap = m
          bindReadyEvent()
        }
      })
    }

    // 兜底：检查 window.__map
    if (!currentMap && (window as unknown as { __map?: GM.Map3D }).__map) {
      currentMap = (window as unknown as { __map?: GM.Map3D }).__map ?? null
      bindReadyEvent()
    }

    errorMessage.value = ''
  } catch (e) {
    handleError(e)
  }
}

function bindReadyEvent() {
  if (!currentMap) return
  currentMap.eventBus.on('map3d:ready', () => {
    previewRef.value?.setStatus({ type: 'ready', message: '运行成功' })
  })
}

function handleError(e: unknown) {
  errorMessage.value = e instanceof Error ? e.message : String(e)
  previewRef.value?.setStatus({ type: 'error', message: '运行失败' })
  console.error('[Playground]', e)
}

function handleRun() {
  executeCode()
}

function handleReset() {
  if (!entry.value) return
  code.value = entry.value.code
  editorRef.value?.setCode(entry.value.code)
  nextTick(() => executeCode())
}

/** 载入示例默认代码并自动运行（进页 / 切换示例） */
function loadEntry() {
  if (!entry.value) return
  cleanupMap()
  code.value = entry.value.code
  editorRef.value?.setCode(entry.value.code)
  errorMessage.value = ''
  nextTick(() => executeCode())
}

// 同路由参数变化（示例间切换）时重新载入
watch(
  () => route.params.name,
  () => {
    if (entry.value) loadEntry()
  },
)

onMounted(() => {
  if (entry.value) {
    code.value = entry.value.code
    nextTick(() => executeCode())
  }
})

onBeforeUnmount(() => {
  cleanupMap()
})

/** 分隔条拖拽调整编辑器宽度 */
function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startW = editorWidth.value
  const onMove = (ev: MouseEvent) => {
    const w = startW + (ev.clientX - startX)
    editorWidth.value = Math.min(Math.max(w, 320), window.innerWidth - 400)
  }
  const onUp = () => {
    window.removeEventListener('mousemove', onMove)
    window.removeEventListener('mouseup', onUp)
  }
  window.addEventListener('mousemove', onMove)
  window.addEventListener('mouseup', onUp)
}
</script>

<style scoped>
.playground {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: none;
  height: 44px;
  padding: 0 12px;
  background: #fff;
  border-bottom: 1px solid #e5e7eb;
}

.toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.toolbar-title {
  font-size: 13px;
  color: #6b7280;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 5px 12px;
  font-size: 12.5px;
  color: #374151;
  background: #f3f4f6;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  cursor: pointer;
  text-decoration: none;
}

.btn:hover {
  background: #e5e7eb;
}

.btn-run {
  color: #fff;
  background: #0f766e;
  border-color: #0f766e;
}

.btn-run:hover {
  background: #115e59;
}

.main-body {
  display: flex;
  flex: 1;
  min-height: 0;
}

.editor-pane {
  flex: none;
  min-width: 320px;
  height: 100%;
  overflow: hidden;
}

.divider {
  flex: none;
  width: 5px;
  cursor: col-resize;
  background: #e5e7eb;
}

.divider:hover {
  background: #0f766e;
}

.preview-pane {
  flex: 1;
  min-width: 0;
  height: 100%;
}

.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: none;
  padding: 8px 12px;
  background: #fef2f2;
  border-top: 1px solid #fecaca;
  font-size: 12.5px;
  color: #b91c1c;
}

.error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ef4444;
  color: #fff;
  font-weight: 700;
}

.error-text {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-close {
  border: none;
  background: none;
  color: #b91c1c;
  cursor: pointer;
  font-size: 14px;
}
</style>
