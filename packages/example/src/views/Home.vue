<script setup lang="ts">
import { caseNames } from '../router'
</script>

<template>
  <div class="home">
    <header class="home-header">
      <h1>GlobalMap Examples</h1>
      <p>基于 Cesium 的 GlobalMap 示例集</p>
    </header>
    <main class="case-grid">
      <router-link
        v-for="name in caseNames"
        :key="name"
        class="case-card"
        :to="{ name: 'case', params: { name } }"
      >
        <span class="case-name">{{ name }}</span>
        <span class="case-path">/case/{{ name }}</span>
      </router-link>
      <p v-if="caseNames.length === 0" class="empty">暂无案例</p>
    </main>
  </div>
</template>

<style scoped>
.home {
  height: 100%;
  overflow: auto;
  padding: 32px 48px;
  box-sizing: border-box;
}

.home-header h1 {
  margin: 0 0 8px;
  font-size: 28px;
}

.home-header p {
  margin: 0 0 24px;
  color: #646a73;
}

.case-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.case-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 20px;
  background: #fff;
  border: 1px solid #e5e6eb;
  border-radius: 8px;
  transition: box-shadow 0.2s;
}

.case-card:hover {
  box-shadow: 0 4px 16px rgb(0 0 0 / 8%);
}

.case-name {
  font-size: 16px;
  font-weight: 600;
}

.case-path {
  font-size: 12px;
  color: #8f959e;
}

.empty {
  color: #8f959e;
}
</style>
