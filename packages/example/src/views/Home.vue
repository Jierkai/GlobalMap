<script setup lang="ts">
import { demos } from '../demos'
</script>

<template>
  <div class="home">
    <header class="home-header">
      <h1>GlobalMap 示例</h1>
      <p>@globalmap/core 编译产物的冒烟测试与示例——点击案例进入「左编辑器 + 右实时预览」</p>
    </header>
    <main class="case-grid">
      <RouterLink
        v-for="demo in demos"
        :key="demo.name"
        class="case-card"
        :to="`/demos/${demo.name}`"
      >
        <span class="case-name">{{ demo.title }}</span>
        <span v-if="demo.description" class="case-desc">{{ demo.description }}</span>
        <span class="case-path">/demos/{{ demo.name }}</span>
      </RouterLink>
    </main>
  </div>
</template>

<style scoped>
.home {
  height: 100%;
  overflow-y: auto;
  padding: 40px 48px;
  box-sizing: border-box;
  background: #f7f8fa;
}

.home-header h1 {
  margin: 0 0 8px;
  font-size: 26px;
  letter-spacing: 0.02em;
  color: #111827;
}

.home-header p {
  margin: 0 0 28px;
  font-size: 13.5px;
  color: #6b7280;
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.case-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  text-decoration: none;
  transition:
    box-shadow 0.2s,
    border-color 0.2s;
}

.case-card:hover {
  border-color: #0f766e;
  box-shadow: 0 6px 18px rgb(15 118 110 / 10%);
}

.case-name {
  font-size: 15px;
  font-weight: 600;
  color: #1f2937;
}

.case-desc {
  font-size: 12.5px;
  color: #6b7280;
}

.case-path {
  margin-top: 6px;
  font-size: 11.5px;
  font-family: ui-monospace, monospace;
  color: #9ca3af;
}
</style>
