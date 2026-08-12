<template>
  <div class="hello-map">
    <!-- 顶部工具栏 -->
    <div class="toolbar">
      <div class="toolbar-left">
        <button class="btn btn-reset" @click="handleReset">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
          重置
        </button>
        <button class="btn btn-run" @click="handleRun">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z" />
          </svg>
          运行
        </button>
      </div>
      <div class="toolbar-title">HelloMap · GlobalMap 调试器</div>
    </div>

    <!-- 主体：左编辑器 + 右预览 -->
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
      <button class="error-close" @click="errorMessage = ''">x</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import CodeEditor from './components/CodeEditor.vue'
import PreviewPanel from './components/PreviewPanel.vue'
import { DEFAULT_CODE } from './defaultCode'
import * as GM from '@globalmap/core'
import * as Cesium from 'cesium'

// === refs ===
const editorRef = ref<InstanceType<typeof CodeEditor>>()
const previewRef = ref<InstanceType<typeof PreviewPanel>>()
const code = ref(DEFAULT_CODE)
const errorMessage = ref('')
const editorWidth = ref(480)

let currentMap: GM.Map3D | null = null

// === 清理当前 Map3D ===
function cleanupMap() {
  if (currentMap) {
    try {
      currentMap.destroy()
    } catch (e) {
      console.warn('[HelloMap] cleanup error:', e)
    }
    currentMap = null
  }
  delete (window as unknown as { __map?: unknown }).__map
}

// === 创建最简地球（初始/重置状态）===
function createSimpleGlobe() {
  cleanupMap()

  const container = previewRef.value?.getContainer()
  if (!container) return
  container.id = 'cesiumContainer'

  previewRef.value?.setStatus({ type: 'running', message: '加载中...' })

  try {
    currentMap = new GM.Map3D({
      container: 'cesiumContainer',
      viewerOptions: {
        infoBox: false,
        geocoder: false,
        baseLayer: new Cesium.ImageryLayer(
          new Cesium.UrlTemplateImageryProvider({
            url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
            credit: 'Esri',
            maximumLevel: 18,
          }),
        ),
      },
    })

    currentMap.eventBus.on('map3d:ready', () => {
      previewRef.value?.setStatus({ type: 'ready', message: '地球就绪' })
    })

    errorMessage.value = ''
  } catch (e) {
    handleError(e)
  }
}

// === 执行编辑器代码 ===
function executeCode() {
  cleanupMap()

  const container = previewRef.value?.getContainer()
  if (!container) return
  container.id = 'cesiumContainer'

  previewRef.value?.setStatus({ type: 'running', message: '运行中...' })

  try {
    // 用 new Function 执行用户代码，注入 Map3D / Cesium / container
    const runFn = new Function('GM', 'Cesium', 'container', code.value)
    const result = runFn(GM, Cesium, container)

    // 处理返回值
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

// === 错误处理 ===
function handleError(e: unknown) {
  errorMessage.value = e instanceof Error ? e.message : String(e)
  previewRef.value?.setStatus({ type: 'error', message: '运行失败' })
  console.error('[HelloMap]', e)
}

// === 按钮事件 ===
function handleReset() {
  code.value = DEFAULT_CODE
  editorRef.value?.setCode(DEFAULT_CODE)
  createSimpleGlobe()
}

function handleRun() {
  executeCode()
}

// === 分隔条拖拽 ===
function startResize(e: MouseEvent) {
  e.preventDefault()
  const startX = e.clientX
  const startW = editorWidth.value
  const onMove = (ev: MouseEvent) => {
    editorWidth.value = Math.max(
      200,
      Math.min(window.innerWidth - 200, startW + ev.clientX - startX),
    )
  }
  const onUp = () => {
    document.removeEventListener('mousemove', onMove)
    document.removeEventListener('mouseup', onUp)
    document.body.style.cursor = ''
  }
  document.body.style.cursor = 'col-resize'
  document.addEventListener('mousemove', onMove)
  document.addEventListener('mouseup', onUp)
}

// === 生命周期 ===
onMounted(() => {
  createSimpleGlobe()
})

onBeforeUnmount(() => {
  cleanupMap()
})
</script>

<style scoped>
.hello-map {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100vh;
  overflow: hidden;
  background: #1e1e1e;
}

/* 工具栏 */
.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  padding: 0 16px;
  background: #252526;
  border-bottom: 1px solid #3c3c3c;
  flex-shrink: 0;
}
.toolbar-left {
  display: flex;
  gap: 8px;
}
.toolbar-title {
  font-size: 13px;
  color: #cccccc;
  font-weight: 500;
}
.btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border: none;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  color: #fff;
  transition: all 0.15s;
}
.btn-reset {
  background: #4a4a4a;
}
.btn-reset:hover {
  background: #5a5a5a;
}
.btn-run {
  background: #2563eb;
}
.btn-run:hover {
  background: #1d4ed8;
}
.btn:active {
  transform: scale(0.97);
}

/* 主体 */
.main-body {
  display: flex;
  flex: 1;
  overflow: hidden;
}
.editor-pane {
  overflow: hidden;
  min-width: 200px;
  flex-shrink: 0;
}
.divider {
  width: 6px;
  background: #3c3c3c;
  cursor: col-resize;
  flex-shrink: 0;
  transition: background 0.15s;
}
.divider:hover {
  background: #007acc;
}
.preview-pane {
  flex: 1;
  overflow: hidden;
  min-width: 200px;
}

/* 错误栏 */
.error-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #5a1d1d;
  color: #ff6b6b;
  font-size: 12px;
  border-top: 1px solid #7a2222;
  flex-shrink: 0;
}
.error-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff6b6b;
  color: #5a1d1d;
  font-weight: bold;
  flex-shrink: 0;
}
.error-text {
  flex: 1;
  word-break: break-all;
}
.error-close {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  font-size: 14px;
  padding: 0 4px;
}
</style>
