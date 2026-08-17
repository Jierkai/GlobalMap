<template>
  <div class="code-editor">
    <codemirror
      v-model="code"
      :extensions="extensions"
      :style="{ height: '100%', fontSize: '13px' }"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { Codemirror } from 'vue-codemirror'
import { javascript } from '@codemirror/lang-javascript'
import { oneDark } from '@codemirror/theme-one-dark'
import { EditorView } from '@codemirror/view'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [string] }>()

const code = ref(props.modelValue)

const extensions = computed(() => [
  javascript({ typescript: true }),
  oneDark,
  EditorView.lineWrapping,
])

watch(code, (v) => emit('update:modelValue', v))
watch(
  () => props.modelValue,
  (v) => {
    if (v !== code.value) code.value = v
  },
)

defineExpose({
  setCode: (v: string) => {
    code.value = v
  },
  getCode: () => code.value,
})
</script>

<style scoped>
.code-editor {
  height: 100%;
  overflow: hidden;
}
.code-editor :deep(.cm-editor) {
  height: 100%;
}
.code-editor :deep(.cm-scroller) {
  overflow: auto;
}
</style>
